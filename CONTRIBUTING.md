<div align="center">

# 🤝 Contributing to Buffer Clip

**Thanks for wanting to help!** You don't need to be a programmer.<br>
Spotting a bug, suggesting an idea or fixing a typo all make Buffer Clip better.

</div>

<br>

> [!NOTE]
> Anyone with a free GitHub account can take part. No invitation needed.

## 📚 Contents

- [Ways you can help](#ways-you-can-help)
- [Before you start: a free GitHub account](#before-you-start)
- [Report a bug](#report-a-bug)
- [Suggest an idea](#suggest-an-idea)
- [Fix a typo or improve the wording](#fix-text)
- [Words you'll see on GitHub](#glossary)
- [For developers](#for-developers)
- [License of your contributions](#license)
- [Be kind](#be-kind)

<a id="ways-you-can-help"></a>

## 💡 Ways you can help

| You can… | What it means | Skills needed |
|:---|:---|:---|
| 🐞 **Report a bug** | Tell us when something doesn't work as expected. | None |
| ✨ **Suggest an idea** | Share a feature or improvement you'd like. | None |
| ✏️ **Fix text** | Correct a typo or make an explanation clearer. | None |
| 🎬 **Share a recording** | Show us a video where the result looked wrong. | None |
| 🧑‍💻 **Write code** | Fix a bug or build a feature. | Programming |

<a id="before-you-start"></a>

## 🪪 Before you start: a free GitHub account

GitHub is the website where Buffer Clip's files and discussions live. To join in, go to [github.com/signup](https://github.com/signup) and create a free account.

That's all the setup you need for everything except writing code.

<a id="report-a-bug"></a>

## 🐞 Report a bug

A "bug" is anything that doesn't work the way it should: a button that does nothing, a video with a strange line, missing sound.

1. Open the Buffer Clip repository on GitHub.
2. Click the **Issues** tab near the top of the page.
3. Click the green **New issue** button.
4. Choose **🐞 Report a bug**.
5. Fill in the short form. Plain words are perfect: there are no wrong answers.
6. Click **Create** (or **Submit new issue**).

**What makes a great bug report:**

- **What you did**, step by step. For example: *"I recorded a tab, opened it in the editor and clicked Export."*
- **What you expected** to happen.
- **What happened instead.**
- **A screenshot or short video.** You can drag the file straight into the form.
- **Your browser**, for example Chrome or Edge.

> [!TIP]
> Not sure if it's a bug? Report it anyway. It's much better to hear about something twice than not at all.

<a id="suggest-an-idea"></a>

## ✨ Suggest an idea

Have an idea that would make Buffer Clip easier or nicer to use?

1. Go to the **Issues** tab and click **New issue**.
2. Choose **✨ Suggest an idea**.
3. Describe the problem your idea solves and how you picture it working. A rough sketch or screenshot of another app helps a lot.
4. Click **Create**.

Before posting, it's worth a quick look through the existing issues: someone may have suggested the same thing. If so, add a 👍 reaction or a comment to show you want it too.

<a id="fix-text"></a>

## ✏️ Fix a typo or improve the wording

You can edit text files, like this guide or the [README](README.md), right in your browser. No downloads needed.

1. Open the file on GitHub, for example **README.md**.
2. Click the ✏️ **pencil icon** (Edit this file) at the top right of the file.
3. The first time, GitHub asks you to **fork** the project, which means making your own copy to edit safely. Click **Fork this repository**.
4. Make your change in the editor.
5. Click the green **Commit changes…** button and write a short note about what you changed, for example *"Fix typo in Getting started"*.
6. Click **Propose changes**, then **Create pull request**, and once more **Create pull request** to send it.

The owner will review your change and add it. If anything needs adjusting, they'll leave a comment and you'll get an email.

<a id="glossary"></a>

## 📖 Words you'll see on GitHub

| Word | What it means |
|:---|:---|
| **Repository** (or "repo") | The project's folder on GitHub, with all its files and history. |
| **Issue** | A post about a bug, idea or question. It's like a ticket. |
| **Pull request** (or "PR") | A proposed change for the owner to review before it's added. |
| **Branch** | A separate copy of the project where changes are made safely. |
| **Commit** | A saved change, with a short note describing it. |
| **Merge** | When a proposed change is accepted into the main project. |
| **Fork** | Your own copy of the project in your account, where you can make changes and then propose them back. |

<a id="for-developers"></a>

## 🧑‍💻 For developers

<details>
<summary><b>Setting up, making changes and opening a pull request</b></summary>

<br>

**Requirements:** Node.js 20+, pnpm 9+, Chrome or Edge.

First **fork** the repository (the **Fork** button at the top of the GitHub page), then clone your fork:

```bash
git clone https://github.com/<your-username>/buffer_clip.git
cd buffer_clip
pnpm install
pnpm dev                                    # web app on http://localhost:3000
pnpm --filter @buffer-clip/extension build  # then load apps/extension/dist in chrome://extensions
```

**Workflow**

1. Create a branch from `main`, for example `fix/export-sound` or `feat/zoom-presets`.
2. Keep each pull request focused on one change.
3. Add or update tests for what you change.
4. Before opening a pull request, make sure everything passes:

   ```bash
   pnpm test                            # unit tests
   pnpm typecheck                       # TypeScript
   pnpm --filter @buffer-clip/web e2e   # end-to-end tests (Playwright)
   ```

5. Push your branch to your fork and open a pull request against `main` of this repository. Describe what changed and how you checked it. Screenshots help for anything visual.

**Where things live**

| Path | What |
|:---|:---|
| `packages/core` | Editing engine: timing, zooms, idle detection, camera and rendering. Pure TypeScript with no browser APIs, so it's easy to test. |
| `apps/web` | The Next.js app: project library, editor and export. |
| `apps/extension` | The Chrome extension that records tabs. |
| `demo` | Scripts that produce the launch demo video. |

</details>

<a id="license"></a>

## 📄 License of your contributions

Buffer Clip is shared under the [PolyForm Noncommercial License 1.0.0](LICENSE): free for personal and non-commercial use, but not for commercial use.

By sending a contribution (code, text, images or anything else), you confirm that you have the right to share it, and you agree that it's licensed under the same terms as the project. You also give the project owner a permanent, worldwide, royalty-free right to use, change, sublicense and relicense your contribution, including under other terms.

<a id="be-kind"></a>

## 💛 Be kind

Everyone here is volunteering their time. Please be patient, friendly and respectful, especially with people who are new to GitHub. There are no silly questions.

<div align="center">
<br>
<sub>Thank you for helping make Buffer Clip better. 🎬</sub>
</div>
