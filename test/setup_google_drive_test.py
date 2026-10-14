"""Provisioning tests with a fake gcloud process; no Cloud access is needed."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "build_tools" / "setup_google_drive.py"
spec = importlib.util.spec_from_file_location("setup_google_drive", SCRIPT)
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)

NUMBER = "123456789012"
CLIENT = NUMBER + "-example.apps.googleusercontent.com"


class Cloud:
    def __init__(self, projects=None):
        self.projects = projects or []
        self.keys = []
        self.calls = []
        self.fail_listing = False

    def run(self, command, **kwargs):
        assert not kwargs.get("shell")
        assert command[0] == "gcloud"
        assert "--quiet" in command and "--format=json" in command
        self.calls.append(command)
        action = command[1:4]
        value = None
        if action[:2] == ["projects", "list"]:
            if self.fail_listing:
                return subprocess.CompletedProcess(command, 1, "", "Permission denied")
            value = self.projects
        elif action[:2] == ["projects", "create"]:
            self.projects.append({
                "projectId": command[3],
                "name": next(arg.split("=", 1)[1] for arg in command if arg.startswith("--name=")),
                "projectNumber": NUMBER, "lifecycleState": "ACTIVE",
            })
        elif action[:2] == ["projects", "describe"]:
            value = next(project for project in self.projects if project["projectId"] == command[3])
        elif action[:2] == ["services", "enable"]:
            pass
        elif action == ["services", "api-keys", "list"]:
            value = self.keys
        elif action == ["services", "api-keys", "create"]:
            key_id = next(arg.split("=", 1)[1] for arg in command if arg.startswith("--key-id="))
            project = next(arg.split("=", 1)[1] for arg in command if arg.startswith("--project="))
            value = {"name": "projects/" + project + "/locations/global/keys/" + key_id}
            self.keys.append(value)
        elif action == ["services", "api-keys", "update"]:
            assert any(key["name"] == command[4] for key in self.keys)
        elif action == ["services", "api-keys", "get-key-string"]:
            assert any(key["name"] == command[4] for key in self.keys)
            value = {"keyString": "test-browser-key"}
        else:
            raise AssertionError("Unexpected gcloud command: " + repr(command))
        return subprocess.CompletedProcess(command, 0, json.dumps(value), "")


def project(name="Struktog Example", project_id="struktog-example", state="ACTIVE"):
    return {"name": name, "projectId": project_id, "projectNumber": NUMBER, "lifecycleState": state}


class SetupTest(unittest.TestCase):
    def run_setup(self, cloud, extra=None, entered=CLIENT + "\n", name="Struktog Example"):
        output, messages = io.StringIO(), io.StringIO()
        arguments = [name, "--repo=git@github.com:Twyleg/struktog_google_drive.git", *(extra or [])]
        with (patch.object(setup.subprocess, "run", side_effect=cloud.run),
              patch.object(setup.shutil, "which", return_value="/fake/gcloud"),
              patch.object(setup.sys, "stdin", io.StringIO(entered)),
              contextlib.redirect_stdout(output), contextlib.redirect_stderr(messages)):
            status = setup.main(arguments)
        return status, output.getvalue(), messages.getvalue()

    def test_new_project_then_rerun_reuses_key_and_replaces_its_restrictions(self):
        cloud = Cloud()
        status, output, messages = self.run_setup(cloud, ["--include-localhost"])
        self.assertEqual(status, 0, messages)
        self.assertEqual(output, "GOOGLE_CLIENT_ID=" + CLIENT + "\nGOOGLE_API_KEY=test-browser-key\nGOOGLE_APP_ID=" + NUMBER + "\n")
        self.assertIn("https://twyleg.github.io/struktog_google_drive/privacy.html", messages)
        self.assertIn("https://twyleg.github.io\n", messages)
        self.assertIn("http://localhost:8081\n", messages)
        self.assertIn(setup.SCOPE, messages)
        creates = [call for call in cloud.calls if call[1:4] == ["services", "api-keys", "create"]]
        self.assertEqual(len(creates), 1)
        self.assertIn("--allowed-referrers=https://twyleg.github.io/*,https://docs.google.com/*,http://localhost:8081/*", creates[0])
        self.assertIn("--api-target=service=picker.googleapis.com", creates[0])
        self.assertIn("--api-target=service=drive.googleapis.com", creates[0])
        enabled = next(call for call in cloud.calls if call[1:3] == ["services", "enable"])
        self.assertTrue({"apikeys.googleapis.com", "drive.googleapis.com", "picker.googleapis.com"}.issubset(enabled))
        # Existing keys unrelated to this script must not be updated or deleted.
        cloud.keys.insert(0, {"name": "projects/other/locations/global/keys/unrelated"})
        status, output2, messages = self.run_setup(cloud, ["--client-id=" + CLIENT])
        self.assertEqual(status, 0, messages)
        self.assertEqual(output, output2)
        self.assertEqual(sum(call[1:3] == ["projects", "create"] for call in cloud.calls), 1)
        self.assertEqual(sum(call[1:4] == ["services", "api-keys", "create"] for call in cloud.calls), 1)
        update = next(call for call in cloud.calls if call[1:4] == ["services", "api-keys", "update"])
        self.assertNotIn("unrelated", update[4])
        self.assertIn("--allowed-referrers=https://twyleg.github.io/*,https://docs.google.com/*", update)
        self.assertFalse(any("delete" in call or "config" in call for call in cloud.calls))

    def test_existing_project_id_and_duplicate_display_names(self):
        cloud = Cloud([project(), project(project_id="another-project")])
        status, output, messages = self.run_setup(cloud)
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertIn("Several projects", messages)
        self.assertEqual(len(cloud.calls), 1)
        status, _, messages = self.run_setup(cloud, ["--project-id=another-project", "--client-id=" + CLIENT])
        self.assertEqual(status, 0, messages)
        self.assertFalse(any(call[1:3] == ["projects", "create"] for call in cloud.calls))

    def test_explicit_new_id_and_organization(self):
        cloud = Cloud()
        status, _, messages = self.run_setup(cloud, ["--project-id=unique-project", "--organization=123", "--client-id=" + CLIENT])
        self.assertEqual(status, 0, messages)
        create = next(call for call in cloud.calls if call[1:3] == ["projects", "create"])
        self.assertEqual(create[3], "unique-project")
        self.assertIn("--organization=123", create)

    def test_listing_failure_does_not_create_a_project(self):
        cloud = Cloud()
        cloud.fail_listing = True
        status, output, messages = self.run_setup(cloud)
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertIn("Permission denied", messages)
        self.assertEqual(len(cloud.calls), 1)

    def test_inactive_project_is_not_modified(self):
        cloud = Cloud([project(state="DELETE_REQUESTED")])
        status, output, messages = self.run_setup(cloud)
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertIn("not ACTIVE", messages)
        self.assertFalse(any(call[1] == "services" for call in cloud.calls))

    def test_client_from_wrong_project_fails_before_api_changes(self):
        cloud = Cloud([project()])
        status, output, messages = self.run_setup(cloud, ["--client-id=999999-other.apps.googleusercontent.com"])
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertIn("different project number", messages)
        self.assertFalse(any(call[1] == "services" for call in cloud.calls))

    def test_console_step_can_resume_after_eof_without_duplicate_key(self):
        cloud = Cloud([project()])
        status, output, messages = self.run_setup(cloud, entered="")
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertIn("Rerun with --client-id", messages)
        self.assertEqual(len(cloud.keys), 1)
        self.assertFalse(any(call[3] == "get-key-string" for call in cloud.calls if len(call) > 3))
        status, _, messages = self.run_setup(cloud, entered="not-a-client-secret\n" + CLIENT + "\n")
        self.assertEqual(status, 0, messages)
        self.assertIn("not JSON or a secret", messages)
        self.assertEqual(len(cloud.keys), 1)

    def test_repo_urls_and_user_pages(self):
        for remote in ["https://github.com/Owner/repo.git", "ssh://git@github.com/Owner/repo.git", "git@github.com:Owner/repo.git", "Owner/repo"]:
            self.assertEqual(setup.repository(remote), ("Owner", "repo"))
        self.assertEqual(setup.pages_url("Owner", "repo"), "https://owner.github.io/repo/")
        self.assertEqual(setup.pages_url("Owner", "owner.github.io"), "https://owner.github.io/")
        for remote in ["https://other.org/Owner/repo", "https://github.com/O/r?x=1", "O/../r", "https://user:secret@github.com/O/r"]:
            with self.assertRaises(setup.SetupError):
                setup.repository(remote)

    def test_default_remote_is_read_from_this_checkout(self):
        result = subprocess.CompletedProcess([], 0, "git@github.com:Owner/repo.git\n", "")
        with patch.object(setup.subprocess, "run", return_value=result) as run:
            self.assertEqual(setup.repository(setup.infer_repository()), ("Owner", "repo"))
            self.assertEqual(run.call_args.args[0], ["git", "config", "--get", "remote.origin.url"])
            self.assertEqual(run.call_args.kwargs["cwd"], SCRIPT.parents[1])
        with patch.object(setup.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "", "")):
            with self.assertRaisesRegex(setup.SetupError, "Supply --repo"):
                setup.infer_repository()

    def test_custom_pages_url_and_restrictions(self):
        cloud = Cloud([project()])
        status, _, messages = self.run_setup(cloud, ["--pages-url=https://diagrams.example.org/editor", "--client-id=" + CLIENT])
        self.assertEqual(status, 0, messages)
        self.assertIn("https://diagrams.example.org/editor/privacy.html", messages)
        create = next(call for call in cloud.calls if call[1:4] == ["services", "api-keys", "create"])
        self.assertIn("--allowed-referrers=https://diagrams.example.org/*,https://docs.google.com/*", create)
        for url in ["http://example.org", "https://example.org/?x=1", "https://example.org/*", "https://example.org/,http://evil.test", "https://example.org:bad"]:
            cloud = Cloud()
            status, output, _ = self.run_setup(cloud, ["--pages-url=" + url])
            self.assertEqual(status, 1)
            self.assertEqual(output, "")
            self.assertEqual(cloud.calls, [])

    def test_invalid_project_id_is_rejected_before_cloud_access(self):
        cloud = Cloud()
        status, output, _ = self.run_setup(cloud, ["--project-id=INVALID"])
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertEqual(cloud.calls, [])

    def test_repository_style_project_name_is_normalized_and_reused(self):
        cloud = Cloud()
        options = ["--client-id=" + CLIENT]
        status, _, messages = self.run_setup(cloud, options, name="struktog_google_drive")
        self.assertEqual(status, 0, messages)
        create = next(call for call in cloud.calls if call[1:3] == ["projects", "create"])
        self.assertEqual(create[3], "struktog-drive")
        self.assertIn("--name=struktog google drive", create)

        status, _, messages = self.run_setup(cloud, options, name="struktog_google_drive")
        self.assertEqual(status, 0, messages)
        self.assertEqual(sum(call[1:3] == ["projects", "create"] for call in cloud.calls), 1)

        for value in ["google", "mySSLthing", "undefined", "null", "123___", "ü!?_"]:
            project_id = setup.generated_project_id(value)
            self.assertRegex(project_id, setup.PROJECT_ID)
            self.assertFalse(any(word in project_id for word in setup.RESTRICTED_PROJECT_STRINGS))
            display_name = setup.project_display_name(value)
            self.assertTrue(4 <= len(display_name) <= 30)
            self.assertRegex(display_name, r"^[A-Za-z0-9'! -]+[A-Za-z0-9]$")

    def test_restricted_explicit_project_id_is_rejected_before_cloud_access(self):
        cloud = Cloud()
        status, output, messages = self.run_setup(cloud, ["--project-id=struktog-google-drive"])
        self.assertEqual(status, 1)
        self.assertEqual(output, "")
        self.assertIn("restricted strings", messages)
        self.assertEqual(cloud.calls, [])

    def test_verbose_keeps_stdout_copyable_and_suppresses_api_key_debugging(self):
        cloud = Cloud([project()])
        status, output, messages = self.run_setup(cloud, ["--verbose", "--client-id=" + CLIENT])
        self.assertEqual(status, 0, messages)
        self.assertEqual(len(output.splitlines()), 3)
        self.assertIn("Running: gcloud projects list", messages)
        for call in cloud.calls:
            if call[1:3] == ["services", "api-keys"]:
                self.assertIn("--verbosity=warning", call)
                self.assertNotIn("--verbosity=debug", call)
            else:
                self.assertIn("--verbosity=debug", call)


if __name__ == "__main__":
    unittest.main()
