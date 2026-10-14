#!/usr/bin/env python3
"""Provision Struktog's browser credentials using an authenticated gcloud CLI.

The web OAuth client/consent screen is a guided console step. No client secret,
user token, .env file, billing account, or GitHub setting is read or written.
"""

import argparse
import hashlib
import json
import re
import shlex
import shutil
import subprocess
import sys
import unicodedata
from collections.abc import Sequence
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ID = re.compile(r"[a-z][a-z0-9-]{4,28}[a-z0-9]")
CLIENT_ID = re.compile(r"([0-9]+)-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com")
SCOPE = "https://www.googleapis.com/auth/drive.file"
RESTRICTED_PROJECT_STRINGS = ("google", "ssl", "undefined", "null")
VERBOSE: bool = False


class SetupError(Exception):
    """A setup failure that can be shown directly to the user."""


def log(message: str) -> None:
    print(message, file=sys.stderr)


def gcloud(*arguments: str) -> Any:
    """Run gcloud and decode its command-specific JSON response."""
    command = ["gcloud", *arguments, "--quiet", "--format=json"]
    manages_keys = arguments[:2] == ("services", "api-keys")

    if VERBOSE:
        # Keep API-key response bodies out of debug output.
        command.append("--verbosity=warning" if manages_keys else "--verbosity=debug")
        log("Running: " + shlex.join(command))

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode:
        raise SetupError(
            "gcloud failed: " + (result.stderr.strip() or "no diagnostic returned")
            + "\nInspect the latest local gcloud log with `gcloud info --show-log`."
        )

    if VERBOSE and not manages_keys and result.stderr.strip():
        log(result.stderr.strip())

    try:
        return json.loads(result.stdout) if result.stdout.strip() else None
    except json.JSONDecodeError:
        raise SetupError("gcloud returned invalid JSON. Update the Google Cloud CLI.") from None


def repository(value: str) -> tuple[str, str]:
    """Accept common GitHub HTTPS/SSH remotes or an owner/repository slug."""
    value = value.strip().rstrip("/")

    if value.startswith("git@github.com:"):
        value = value[len("git@github.com:"):]
    elif "://" in value:
        parsed = urlsplit(value)
        uses_ssh_user = parsed.scheme == "ssh" and parsed.username == "git"

        if (
            parsed.hostname != "github.com"
            or parsed.scheme not in ("https", "ssh")
            or parsed.query
            or parsed.fragment
            or parsed.password
            or parsed.port
            or (parsed.username and not uses_ssh_user)
        ):
            raise SetupError("Use a github.com repository URL or owner/repository with --repo.")

        value = parsed.path.strip("/")

    if value.endswith(".git"):
        value = value[:-4]

    parts = value.split("/")

    if (
        len(parts) != 2
        or not re.fullmatch(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*", parts[0])
        or not re.fullmatch(r"[A-Za-z0-9_.-]+", parts[1])
        or parts[1] in (".", "..")
    ):
        raise SetupError("Use a github.com repository URL or owner/repository with --repo.")

    return parts[0], parts[1]


def infer_repository() -> str:
    """Read this checkout's origin, regardless of the current working directory."""
    result = subprocess.run(
        ["git", "config", "--get", "remote.origin.url"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode:
        raise SetupError("No origin remote found. Supply --repo OWNER/REPOSITORY.")

    return result.stdout.strip()


def pages_url(owner: str, repo: str, override: str | None = None) -> str:
    """Resolve the deployment URL and reject unsupported URL components."""
    path = "" if repo.lower() == owner.lower() + ".github.io" else repo + "/"
    value = override or "https://" + owner.lower() + ".github.io/" + path
    parsed = urlsplit(value)

    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or any(char.isspace() for char in value)
        or any(char in value for char in (",", "*", "\\"))
    ):
        raise SetupError(
            "--pages-url must be an HTTPS URL without credentials, wildcards, or query/fragment."
        )

    # Validate the port, too, before making any Cloud changes.
    _ = parsed.port

    return value.rstrip("/") + "/"


def generated_project_id(name: str) -> str:
    """Derive a stable project ID from a human-readable project name."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")

    for restricted in RESTRICTED_PROJECT_STRINGS:
        value = value.replace(restricted, "-")

    value = re.sub(r"-+", "-", value).strip("-")

    if not value or not value[0].isalpha():
        value = "struktog-" + value

    if len(value) < 6:
        value += "-project"

    return value[:30].rstrip("-")


def project_display_name(name: str) -> str:
    """Normalize repository-style names to Google's display-name character set."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    value = re.sub(r"[^A-Za-z0-9'! -]+", " ", ascii_name)
    value = " ".join(value.split())[:30]
    value = re.sub(r"[^A-Za-z0-9]+$", "", value).strip()

    if not value:
        return "Struktog"

    if len(value) < 4:
        value += " app"

    return value


def ensure_project(args: argparse.Namespace) -> tuple[str, str]:
    """Reuse/create the project and return its ID and numeric project number."""
    projects = gcloud("projects", "list")
    if not isinstance(projects, list):
        raise SetupError("Could not list accessible Google Cloud projects.")

    wanted_id = args.project_id or args.project_name
    display_name = project_display_name(args.project_name)
    matches = [project for project in projects if project.get("projectId") == wanted_id]

    if not matches and not args.project_id:
        matches = [project for project in projects if project.get("name") == args.project_name]

    if not matches and not args.project_id:
        matches = [project for project in projects if project.get("name") == display_name]

    if len(matches) > 1:
        raise SetupError("Several projects have that name. Select one explicitly with --project-id.")

    if matches:
        project_id = matches[0]["projectId"]
        log("Reusing Google Cloud project: " + project_id)
    else:
        project_id = args.project_id or generated_project_id(args.project_name)

        if any(project.get("projectId") == project_id for project in projects):
            raise SetupError(
                "The generated project ID is already used by a differently named project. "
                "Use --project-id."
            )

        log("Creating Google Cloud project: " + project_id)
        log("Project display name: " + display_name)

        parent: list[str] = []
        if args.organization:
            parent.append("--organization=" + args.organization)
        elif args.folder:
            parent.append("--folder=" + args.folder)

        gcloud("projects", "create", project_id, "--name=" + display_name, *parent)

    project = gcloud("projects", "describe", project_id)
    if not isinstance(project, dict) or project.get("lifecycleState") != "ACTIVE":
        raise SetupError("The selected Google Cloud project is not ACTIVE.")

    number = str(project.get("projectNumber", ""))
    if not number.isdigit():
        raise SetupError("Google Cloud did not return a numeric project number.")

    return project_id, number


def validate_client_id(value: str, project_number: str) -> str:
    """Check the client ID format and its project-number prefix."""
    match = CLIENT_ID.fullmatch(value)
    if not match:
        raise SetupError(
            "Enter only the web OAuth client ID ending in .apps.googleusercontent.com, "
            "not JSON or a secret."
        )

    if match[1] != project_number:
        raise SetupError(
            "The OAuth client ID belongs to a different project number. "
            "Create/select a web client in this project."
        )

    return value


def ensure_key(
    project_id: str,
    repo_slug: str,
    site_url: str,
    include_localhost: bool,
) -> str:
    """Create/restrict this repository's browser key and return its resource name."""
    # A stable ID isolates this script's key from all unrelated project keys.
    key_id = "struktog-browser-" + hashlib.sha256(repo_slug.lower().encode()).hexdigest()[:12]

    keys = gcloud("services", "api-keys", "list", "--project=" + project_id)
    if not isinstance(keys, list):
        raise SetupError("Could not list API keys in the selected project.")
    name: str | None = next(
        (key["name"] for key in keys if key.get("name", "").endswith("/keys/" + key_id)),
        None,
    )

    parsed = urlsplit(site_url)
    # Modern browsers can send only the origin as the referrer across origins.
    referrers = [parsed.scheme + "://" + parsed.netloc + "/*", "https://docs.google.com/*"]
    if include_localhost:
        referrers.append("http://localhost:8081/*")

    restrictions = [
        "--allowed-referrers=" + ",".join(referrers),
        "--api-target=service=picker.googleapis.com",
        "--api-target=service=drive.googleapis.com",
        "--project=" + project_id,
    ]

    if name:
        log("Reusing browser API key and applying the current restrictions: " + key_id)
        gcloud("services", "api-keys", "update", name, *restrictions)
    else:
        log("Creating restricted browser API key: " + key_id)
        gcloud(
            "services", "api-keys", "create",
            "--key-id=" + key_id,
            "--display-name=Struktog " + repo_slug,
            *restrictions,
        )
        name = "projects/" + project_id + "/locations/global/keys/" + key_id

    return name


def oauth_instructions(project_id: str, site_url: str, include_localhost: bool) -> None:
    """Walk through consent setup, test users, and creation of a web OAuth client."""
    origin = urlsplit(site_url)

    log("\nManual Google OAuth setup (keep this terminal open while using your browser)")
    log("Check that the selected Google Cloud project is: " + project_id)
    log("The project, APIs, and browser API key are ready; the web OAuth client is still needed.")

    log("\n1. Configure Google Auth Platform and the consent screen")
    log("  Open: https://console.cloud.google.com/auth/branding?project=" + project_id)
    log("  If setup has not started, click Get started. Otherwise review the existing settings.")
    log("  App information: enter an app name, e.g. Struktog, and select a user support email.")
    log("  Audience: choose External so accounts outside your organization can use the app.")
    log("  Contact information: enter your developer contact email.")
    log("  Finish: review Google's User Data Policy, accept it if appropriate, and click Create.")
    log("  On Branding, add/save the following app links when configuring the public deployment:")
    log("    Homepage: " + site_url)
    log("    Privacy policy: " + urljoin(site_url, "privacy.html"))
    log("    Terms: " + urljoin(site_url, "terms.html"))

    log("\n2. Add yourself and any other testers as test users")
    log("  Open: https://console.cloud.google.com/auth/audience?project=" + project_id)
    log("  For initial testing, keep the publishing status as Testing.")
    log("  Scroll to Test users, click Add users, and enter each tester's Google account email.")
    log("  Include the account you will sign in with when opening Google Drive in Struktog.")
    log("  Click Save and check that the email addresses appear in the Test users list.")
    log("  Test-user access is separate from project IAM membership or the gcloud login account.")
    log("  With an External app in Testing, only the listed test users can authorize Drive access.")

    log("\n3. Configure the required Google Drive scope")
    log("  Open: https://console.cloud.google.com/auth/scopes?project=" + project_id)
    log("  Click Add or remove scopes. Find/select the following scope, or enter it manually:")
    log("    " + SCOPE)
    log("  Click Update, then Save. This app does not require full access to all Drive files.")

    log("\n4. Create the web OAuth client")
    log("  Open: https://console.cloud.google.com/auth/clients?project=" + project_id)
    log("  Click Create client. Select Application type: Web application.")
    log("  Enter a client name, e.g. Struktog web.")
    log("  Under Authorized JavaScript origins, click Add URI and enter:")
    log("    " + origin.scheme + "://" + origin.netloc)
    if include_localhost:
        log("  Add another URI for local development:")
        log("    http://localhost:8081")

    log("  Origins contain only scheme, hostname, and optional port: no repository path or /*.")
    log("  Leave Authorized redirect URIs empty; this app uses the Google popup token flow.")
    log("  Click Create. If a suitable Web application client already exists here, review/reuse it.")

    log("\n5. Copy the client ID back into this terminal")
    log("  In the created client's details, copy Client ID (ending in .apps.googleusercontent.com).")
    log("  Paste only that ID at the prompt below and press Enter; no client secret or JSON file.")
    log("  The script will print GOOGLE_CLIENT_ID, GOOGLE_API_KEY, and GOOGLE_APP_ID for GitHub.")

    log("\nBefore opening access to the public:")
    log("  A public GitHub Pages site does not change the OAuth app's Testing status.")
    log("  On Audience, review Publish app and any required Google verification steps.")
    log("  In production, access is no longer limited to the Testing user list.")
    log("  The script cannot validate these console settings or publish the OAuth app for you.")

    log("\nGoogle's setup instructions:")
    log("  https://developers.google.com/workspace/guides/configure-oauth-consent")
    log("  https://developers.google.com/workspace/guides/create-credentials#web-application")


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)

    result.add_argument(
        "project_name",
        help="Existing project ID/display name, or the display name for a new project",
    )
    result.add_argument(
        "--project-id",
        help="Exact project ID to reuse/create (6–30 lowercase letters/digits/hyphens)",
    )

    result.add_argument(
        "--repo",
        help="GitHub URL or OWNER/REPOSITORY; defaults to this checkout's origin",
    )
    result.add_argument(
        "--pages-url",
        help="Override the inferred Pages URL, e.g. for a custom domain",
    )

    result.add_argument(
        "--client-id",
        help="Existing web OAuth client ID; otherwise prompted after console instructions",
    )
    result.add_argument(
        "--include-localhost",
        action="store_true",
        help="Also allow http://localhost:8081 for development",
    )
    result.add_argument(
        "--verbose",
        action="store_true",
        help="Show gcloud commands and debug diagnostics (API-key response debugging is suppressed)",
    )

    parent = result.add_mutually_exclusive_group()
    parent.add_argument("--organization", help="Organization ID for a newly created project")
    parent.add_argument("--folder", help="Folder ID for a newly created project")

    return result


def prompt_client_id(project_number: str) -> str:
    """Keep prompting until a valid client ID is entered or stdin closes."""
    while True:
        print(
            "\nPaste the web OAuth client ID (Ctrl+C to stop): ",
            file=sys.stderr,
            end="",
            flush=True,
        )

        value = sys.stdin.readline()
        if not value:
            raise SetupError(
                "No client ID provided. Rerun with --client-id after the console step; "
                "the project/key will be reused."
            )

        try:
            return validate_client_id(value.strip(), project_number)
        except SetupError as error:
            log(str(error))


def main(argv: Sequence[str] | None = None) -> int:
    """Validate input, provision Cloud resources, and print GitHub variables."""
    args = parser().parse_args(argv)
    global VERBOSE
    VERBOSE = args.verbose

    try:
        if (
            not 4 <= len(args.project_name) <= 30
            or any(ord(char) < 32 for char in args.project_name)
        ):
            raise SetupError("Use a project name with 4–30 characters and no control characters.")

        if args.project_id and not PROJECT_ID.fullmatch(args.project_id):
            raise SetupError(
                "--project-id must have 6–30 lowercase letters/digits/hyphens, "
                "start with a letter, and end with a letter/digit."
            )

        if args.project_id and any(word in args.project_id for word in RESTRICTED_PROJECT_STRINGS):
            raise SetupError(
                "--project-id cannot contain restricted strings: "
                + ", ".join(RESTRICTED_PROJECT_STRINGS)
                + "."
            )

        owner, repo = repository(args.repo or infer_repository())
        site_url = pages_url(owner, repo, args.pages_url)

        if not shutil.which("gcloud"):
            raise SetupError(
                "Install Google Cloud CLI (https://cloud.google.com/sdk/docs/install), "
                "then run `gcloud auth login`."
            )

        log("Repository: https://github.com/" + owner + "/" + repo)
        log("Pages URL: " + site_url + " (use --pages-url for a custom domain)")

        project_id, project_number = ensure_project(args)
        if args.client_id:
            validate_client_id(args.client_id, project_number)

        log("Enabling Drive, Picker, and API Keys APIs…")
        gcloud(
            "services", "enable",
            "serviceusage.googleapis.com",
            "apikeys.googleapis.com",
            "drive.googleapis.com",
            "picker.googleapis.com",
            "--project=" + project_id,
        )
        key_name = ensure_key(project_id, owner + "/" + repo, site_url, args.include_localhost)

        oauth_instructions(project_id, site_url, args.include_localhost)
        client_id = args.client_id or prompt_client_id(project_number)

        key = gcloud("services", "api-keys", "get-key-string", key_name, "--project=" + project_id)
        api_key = key.get("keyString") if isinstance(key, dict) else None

        if not isinstance(api_key, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", api_key):
            raise SetupError("Google Cloud did not return a valid API key string.")

        log("\nCopy these values into GitHub Actions repository variables (name and value separately).")
        log(
            "These browser values are public in the built app. "
            "The client origins/consent settings still need to be correct."
        )

        print("GOOGLE_CLIENT_ID=" + client_id)
        print("GOOGLE_API_KEY=" + api_key)
        print("GOOGLE_APP_ID=" + project_number)
        return 0

    except (SetupError, ValueError, OSError) as error:
        log("Error: " + str(error))
        return 1

    except KeyboardInterrupt:
        log("\nStopped. Any project/key already created can be reused on the next run.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
