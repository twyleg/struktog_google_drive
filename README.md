# Struktog

Struktog is an open-source web editor for creating structograms in computer science education.

The project intentionally keeps runtime dependencies at zero to remain independent and easy to maintain long-term. The application is implemented in plain JavaScript, SCSS, and HTML. External packages are used only as development tooling (`devDependencies`).

## Official Links

- Website: https://ddi.education/struktog/
- Original repository: https://gitlab.com/dev-ddi/cs-school-tools/struktog/

## Forks and Mirrors

Forks and mirrors of Struktog exist on other platforms. This repository is the officially maintained source of truth.

Notable fork:

- **OpenPatch / struktolab**: https://github.com/openpatch/struktolab  
  Integrated into the OpenPatch project. OpenPatch develops open-source projects for assessment and training of competencies in computer science.  
  Maintainer: **Mike Barkmin**.

If your fork should be listed here, feel free to open a PR.

## Features

- Visual structogram editor with drag-and-drop workflow
- Optional source-code view and language-specific generation
- Profile-based element visibility and color configuration
- Guided web tour and keyboard shortcuts (`Alt+1..0`)
- JSON import/export and PNG image export
- Optional offline support via service worker in production builds

## Quick Start

### Prerequisites

- Node.js
- npm
- Git

### Install

```bash
npm install
```

### Run development server

```bash
npm run watch
```

### Build production bundle

```bash
npm run build
```

The production output is written to `build/`.

## URL Configuration

You can customize startup behavior with URL parameters.

### `config` profiles

Examples:

```bash
https://ddi.education/struktog/?config=standard
https://ddi.education/struktog/?config=all
https://ddi.education/struktog/?config=beginner
https://ddi.education/struktog/?config=c
https://ddi.education/struktog/?config=python
https://ddi.education/struktog/?config=python_func
```

### `url` task import

Load a JSON task at startup:

```bash
{domain}/?url=https://example.org/path/to/task.json
{domain}/?url=example1.json
```

Note: External hosts must allow CORS for browser-side loading.

## Import and Export

The toolbar provides **New**, **Open file**, **Save locally**, **Google Drive**,
**Save to Drive**, **Save as in Drive**, **Export image**, and **Settings**.
Local saves download a JSON copy. **Save to Drive** updates the current Drive file;
**Save as in Drive** opens Google Picker to choose a destination folder, then
asks for a filename and creates a new file in that folder. **Save to Drive** is
available after opening or creating a writable Drive file.

The **Google Drive** dropdown remembers the six most recently opened or saved
Drive files in this browser and offers **Open another file…** for Google Picker.
File IDs, names, and last known folder paths are stored locally. Paths appear
after filenames and are refreshed in the background when a file is opened or
saved. If an ancestor folder is inaccessible, the available portion of the path
is shown with an ellipsis. A parent-reference check identifies the My Drive
root even when its folder metadata is inaccessible, using the existing
`drive.file` permission. Partial paths are retried when the menu is opened
while signed in. Older entries acquire a path when reopened. The status row shows the current file,
its location, and whether it has unsaved changes. `Ctrl+S` / `Cmd+S` saves the
current Drive file or downloads a local copy. Drive actions are disabled when
Google Drive is not configured.

### JSON export

Current exports use a v2 payload with:

- `formatVersion`
- `meta`
- `settings`
- `tree`

When loading, Struktog restores persisted settings from the file, including:

- profile
- visible elements
- element colors
- UI language
- code language
- source-code visibility
- shortcut setting

Legacy exports that only contain `tree` are still supported.

### PNG export

The image export dialog offers PNG/SVG downloads and **Copy PNG** / **Copy SVG**
for pasting into another application. Clipboard copying requires HTTPS or localhost
and browser permission. SVG copying is enabled only when the browser supports it;
the receiving application must also accept SVG. The existing SVG export embeds
HTML in `foreignObject`, which some applications or clipboard sanitizers may omit;
use PNG for the most reliable visual result.

## Development

Useful scripts:

```bash
npm run watch
npm run dev
npm run build
npm run chromium
```

## Testing

Run UI tests (Selenium against local build):

```bash
npm test
```

`npm test` runs the mocked Drive and clipboard tests, builds the project, and then runs
`test/buttontest.js`. The Drive tests require Node.js 18 or newer.

### Optional environment variables

- `STRUKTOG_MAX_DEPTH` controls nesting depth (default: `2`)
- `STRUKTOG_FAST_NESTED=true` enables a faster nested mode
- `STRUKTOG_VERBOSE=true` shows detailed test steps
- `STRUKTOG_TEST_URL` overrides the target URL (default: local `build/index.html`)

## Offline Support

Production builds generate and register a service worker, enabling offline usage after first load.

Notes:

- Service workers are only active in secure contexts (`https://` or `localhost`).
- After updates, a hard reload may be required to activate new assets immediately.

## Download

- Latest release: https://releases.ddi.education/struktog-latest.tar.gz
- All releases: https://gitlab.com/dev-ddi/cs-school-tools/struktog/-/releases

## Contributing

Contributions are welcome. Please open an issue or pull request in the official repository.

## Maintainer

Thiemo Leonhardt

## License

AGPL-3.0 (see `LICENSE`).

## Google Drive (optional)

The toolbar offers **Open from Google Drive**, **Save as to Google Drive**,
**Save to Google Drive**, and **Download local copy**. **Save to Google Drive**
updates the same Drive file after opening or creating it, without an overwrite
confirmation. For new/local diagrams it opens the folder and filename selection
used by **Save as to Google Drive**. **Ctrl+S / Cmd+S** updates the current Drive
file or downloads a local copy for new/local diagrams. Drive copies use the same v2 JSON export (including
settings) as local files. A dot beside the filename indicates unsaved changes.
Downloading a local copy does not mark a Drive document as saved to Drive.
Drive errors appear in the toolbar without a blocking browser alert. While
waiting for Google sign-in or Picker, use **Cancel Google action** or Escape
to stop waiting and restore the controls. Sign-in also times out after two
minutes; close an abandoned Google popup before retrying. Cancelling Picker
removes its overlay. Uploads already in progress cannot be cancelled this way.


### Google Cloud setup for development and deployment

For a guided setup, install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
and Python 3.10+, sign in, and run:

```bash
gcloud auth login
python3 build_tools/setup_google_drive.py "Struktog Google Drive"
```

The script looks up the project by exact ID or display name and creates it if
missing. New project IDs are derived from the supplied name; IDs are globally
unique, so use `--project-id=your-unique-project-id` if that ID is taken. Duplicate
display names require `--project-id` to select the intended project. Creating
projects, enabling services, and managing API keys require the corresponding
Cloud permissions; organizations may require `--organization=ID` or `--folder=ID`.
The script uses your active `gcloud` account and does not change its default
project or attach billing accounts.

Repository-style names are accepted: `struktog_google_drive` becomes display
name `struktog google drive` and project ID `struktog-drive`. Generated IDs omit
Google's restricted strings (`google`, `ssl`, `undefined`, `null`); explicit
`--project-id` values containing them are rejected locally. Other invalid
display-name characters are converted to spaces. Repeat runs also look up the
normalized display name so the same project is reused.

For diagnostics, add `--verbose` to show gcloud commands and debug output on
stderr. API-key commands suppress debug response bodies; stdout still contains
only the three browser configuration assignments. Google Cloud CLI also keeps
local logs: `gcloud info --show-log` displays the latest, and `gcloud info` shows
the log directory so you can inspect an earlier failed invocation.

It enables Drive, Picker, and API Keys APIs, creates a browser key restricted to
Drive/Picker and the deployment origin plus `https://docs.google.com/*`, and
retrieves the numeric project number. Repeat runs reuse the script's key for
that repository and replace its restrictions with the current options; unrelated
API keys are left alone. Add `--include-localhost` to also allow development at
`http://localhost:8081`. Without that flag, the key is for the deployed site.
Website restrictions use the origin with `/*` because browsers may omit the
repository path from cross-origin referrers.

The repository defaults to this checkout's Git `origin` (HTTPS and SSH remotes
work). Override with `--repo=OWNER/REPOSITORY` or a GitHub repository URL.
The inferred site is `https://OWNER.github.io/REPOSITORY/`, or the root URL for
an `OWNER.github.io` repository. For custom domains use
`--pages-url=https://diagrams.example.org/`. Keep `site.config.json` aligned
with that URL; the script does not rewrite it.

Web OAuth client creation and the consent screen remain a guided console step.
The script prints the project-specific Google Auth Platform links, homepage,
privacy/terms URLs, required scope, and JavaScript origins. It walks through the
initial consent-screen wizard, adding test users, selecting the Drive scope,
creating a **Web application** client, and copying its **Client ID** back to
the terminal. Keep the terminal open while completing the browser steps.

For testing, open the printed **Audience** link, keep the app in **Testing**,
then select **Test users → Add users**. Enter the Google account email you will
use to sign in to Drive in Struktog, add any other testers, and click **Save**.
Check that the addresses appear in the list. Project IAM membership and the
account used for `gcloud auth login` do not automatically make an account an
OAuth test user. Hosting the site publicly does not publish the OAuth app;
review **Audience → Publish app** and any required verification before opening
Google Drive access to the public. See Google's
[consent-screen and test-user instructions](https://developers.google.com/workspace/guides/configure-oauth-consent).

On later runs, pass `--client-id=YOUR_CLIENT_ID` to
skip the prompt. This checks the client ID's format/project-number prefix;
it cannot verify the web client's type, origins, consent settings, or publication.
No client secret is needed. Google documents the
[web OAuth console setup](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#creatingcred);
IAM/workforce OAuth clients do not replace this client.

On success, stdout contains exactly these three assignments, ready to copy into
the GitHub repository's Actions variables (name/value separately):

```text
GOOGLE_CLIENT_ID=…
GOOGLE_API_KEY=…
GOOGLE_APP_ID=…
```

Progress and console instructions go to stderr. If interrupted during the
console step, rerun the same command; the project/key are retained and reused.
The script does not read/write `.env` or update GitHub automatically. These
browser configuration values will be public in the deployed JavaScript bundle.

Run its offline tests with
`python3 -B -m unittest discover -s test -p 'setup_google_drive_test.py'`.
The equivalent manual setup is:

1. Create a Google Cloud project and enable **Google Drive API** and
   **Google Picker API** in its API Library.
2. Configure Google Auth Platform's branding, audience, and consent screen.
   Add `https://www.googleapis.com/auth/drive.file` to Data Access. In Testing
   mode, add each account that will use the integration as a test user.
   Configure the appropriate publishing status before making the app public.
3. Create an OAuth client of type **Web application**. Add
   `http://localhost:8081` to **Authorized JavaScript origins** for development,
   plus the exact HTTPS origin for each deployment, for example
   `https://diagrams.example.org`. Origins do not include paths.
   This integration uses the Google Identity Services popup token flow;
   it does not need a redirect URI, client secret, or backend.
4. Create a browser API key in the same project. Restrict it to **Google Picker
   API** and **Google Drive API**, and restrict website referrers to
   `http://localhost:8081/*`, your deployed site's URL pattern, and
   `https://docs.google.com/*` (Picker runs inside a Google-hosted iframe). Use separate development/production keys if
   desired. The OAuth client and Picker must belong to the same project.
5. Set these environment variables when starting webpack or building:

   ```bash
   export STRUKTOG_GOOGLE_CLIENT_ID='your-client-id.apps.googleusercontent.com'
   export STRUKTOG_GOOGLE_API_KEY='your-browser-api-key'
   export STRUKTOG_GOOGLE_APP_ID='your-numeric-google-cloud-project-number'
   npm run watch
   # Or, with the same variables in the deployment build environment:
   npm run build
   ```

   `APP_ID` is the numeric **project number**, not the textual project ID.
   Alternatively, copy `.env.example` to `.env` and fill in `GOOGLE_CLIENT_ID`,
   `GOOGLE_API_KEY`, and `GOOGLE_APP_ID`. Webpack loads `.env` automatically;
   the `STRUKTOG_GOOGLE_*` variables take precedence over the `GOOGLE_*` aliases.
   These are build-time settings; restart the development server or rebuild
   when changing them. Values appear in the browser bundle by design;
   do not supply a client secret. If any value is missing, Drive controls are
   disabled and local editing continues to work.

Allow Google popups and serve over localhost or HTTPS (not `file://`). If your
hosting uses Cross-Origin-Opener-Policy, use `same-origin-allow-popups` for this
popup flow. If you set a Content Security Policy, allow the Google Identity
Services and Picker scripts, frames, and Google API connections according to
Google's deployment guidance. The integration loads Google's libraries only
when configured and needs network access; local editing remains available offline.

Only `drive.file` is requested: users grant access to files selected explicitly
through the official Picker and files created by this app. The Picker starts at the My Drive root in list view, with folders available
for navigation. It shows all files so previously uploaded JSON with a generic MIME type remains selectable;
Struktog validates the diagram before importing it. Google Docs/Sheets are not
Struktog files. Tokens live only in memory. Expired tokens are renewed on the next
user action; if a request returns 401, click the action again to sign in.

Drive association also lives only in memory. After a page reload, the editor's
existing local recovery remains, but reopen the Drive file to reconnect it.
A reset starts a new document; undo restores content, not the previous storage
association. Renaming the diagram changes its exported title, not its existing
Drive filename. New Drive copies are created in the folder selected through Google Picker.

Saving updates the existing Drive file directly, including any changes made
remotely since it was opened. Use **Save as to Google Drive** to create a separate
copy. Deleted, trashed, inaccessible,
and read-only files produce errors without clearing the editor. Failed saves
retain the dirty state. An interrupted upload can have succeeded remotely;
check Drive before retrying a new-file upload to avoid creating duplicate copies.

Implementation references: [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model),
[Picker web integration](https://developers.google.com/workspace/drive/picker/guides/overview),
[Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads),
and [file version metadata](https://developers.google.com/workspace/drive/api/reference/rest/v3/files).

Run mocked storage/auth/document tests with `npm run test:drive`. They need no
Google credentials. For a real-account smoke test, open an uploaded Struktog
JSON, edit it, and save; verify the same Drive file ID is updated. Also test a
new/local diagram → Drive copy → edit → Ctrl+S, Picker cancellation, denied
consent, token expiry, a read-only/deleted file, offline uploads, and a remote
edit followed by a direct overwrite. Real OAuth/Picker testing requires your
configured Google Cloud project and an interactive browser.

## Privacy and public deployment

Google Drive libraries are not loaded on startup. The first Drive action opens
an activation notice. Cancelling before activation makes no Google request.
Activation is valid only for the current tab; reloading ends it. After the
libraries load, Continue starts the chosen action with a fresh user gesture so
Google sign-in is not blocked as an automatic popup.

Workspace data stays in memory by default. **Browser data** in the footer offers
two separate optional choices: persistent workspace storage and offline caching.
Persisted workspace data includes diagrams, generated code, settings, tour status,
and recent Drive file metadata. The necessary choice record is the only browser
storage read before optional persistence is enabled. Previous-version workspace
data is not read without this choice. Deleting saved data keeps the current
workspace open, removes saved workspace data, and disables offline caching.
The service worker is registered only when offline caching is selected.

Fill in `site.config.json` before publication:

- `operatorName`: the actual person or organisation operating this deployment.
- `operatorAddress`: postal address; use `\n` between address lines.
- `contactEmail`: public operator/privacy contact.
- `siteUrl`: the complete public app URL, e.g. `https://your-account.github.io/your-repository/`.
- `sourceUrl`: public repository containing the complete source of this modified version.
- `projectUrl`: project/contact reference; currently the supplied GitHub repository.
- `privacyUpdated`: date of the last reviewed privacy-notice update.

The generated `privacy.html`, `imprint.html`, and `terms.html` are standalone
German/English pages with no app scripts or Google connection. Incomplete
operator configuration is marked as a draft. Review the texts for your actual
operator, hosting arrangements, lawful bases and provider transfer/retention
conditions; the template is not a legal compliance certification.

Use `npm run build:public` for deployment. It validates the deployment/source
URLs and any supplied contact email. At the operator’s request, the current
configuration refers to the GitHub project instead of personal operator details.
A repository-only configuration can be built, but the legal pages remain marked
as drafts because a project link does not replace required operator information.
The Pages URL is set to the standard project URL; change it if using a custom domain. Ordinary `npm run build`
continues to produce a development/review build with draft notices.

For Google OAuth, register the production site's **origin** (scheme and host,
without the repository path) as an authorized JavaScript origin. Set the full
homepage, `privacy.html`, and `terms.html` URLs in Google Auth Platform branding.
Publish the app to the appropriate production audience and complete any required
Google verification. The footer source link must refer to this modified version,
not only the upstream project. Relative links and the service worker also work
under a GitHub Pages repository subdirectory.

Run `npm run test:privacy` for storage-choice and offline lifecycle tests.

## Deploying to GitHub Pages

The workflow in `.github/workflows/pages.yml` tests the app, runs
`npm run build:public`, and deploys only the generated `build/` directory using
GitHub's Pages actions. It runs on pushes to `master` and can be started manually
from **Actions → Deploy GitHub Pages → Run workflow** on the default branch.
Deployments wait for tests and the build to pass. No `gh-pages` branch is needed.

One-time repository setup:

1. Under **Settings → Pages → Build and deployment**, select **GitHub Actions**
   as the source.
2. To enable Google Drive in the published app, add these repository variables
   under **Settings → Secrets and variables → Actions → Variables**:

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
   | `GOOGLE_API_KEY` | Browser API key for Google Picker |
   | `GOOGLE_APP_ID` | Numeric Google Cloud project number |

   Repository secrets with the same names are also supported as a fallback.
   These are browser configuration values and appear in the published JavaScript;
   do not supply OAuth client secrets or access/refresh tokens. The local `.env`
   stays ignored and is not available to GitHub Actions. With all three values
   omitted, the site builds with Google Drive disabled.
3. Keep `site.config.json` aligned with the deployment URL. The current URL is
   `https://twyleg.github.io/struktog_google_drive/`. Authorize
   `https://twyleg.github.io` in the OAuth client's JavaScript origins and allow
   the production site in the browser API key's HTTP referrer restrictions.
   Keep localhost origins/referrers too if using the same configuration locally.
4. Commit the workflow, `package-lock.json`, `site.config.json`, and the app
   changes, then push to `master` (or run the workflow manually after pushing).

The deployment job reports the published URL in the `github-pages` environment.
If the default branch is renamed, update the workflow's `push.branches` filter
and the environment's branch protection rules. Manual deployments from other
branches are skipped.
