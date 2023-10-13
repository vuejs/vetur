<p>
  <h1 align="center">Vetur</h1>
</p>

Project Status ⚙️ 
issue: https://github.com/vuejs/vetur/issues/3476

New official vue editor support: Volar   
VSCode extension: https://marketplace.visualstudio.com/items?itemName=Vue.volar   
Project: https://github.com/johnsoncodehk/volar   
LSP: https://github.com/johnsoncodehk/volar

<p align="center">
  <a href="https://github.com/vuejs/vetur/actions?query=workflow%3A%22Node+CI%22">
    <img src="https://img.shields.io/github/workflow/status/vuejs/vetur/Node%20CI?label=%20&logo=github&style=flat-square&logoColor=white&color=42b883">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=octref.vetur">
    <img src="https://vsmarketplacebadges.dev/version-short/octref.vetur.png?label=%20&style=flat-square&color=42b883">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=octref.vetur">
    <img src="https://vsmarketplacebadges.dev/installs-short/octref.vetur.png?label=%20&style=flat-square&color=35495e">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=octref.vetur">
    <img src="https://vsmarketplacebadges.dev/rating-short/octref.vetur.png?label=%20&style=flat-square&color=35495e">
  </a>
  <br>
</p>

🛠️ Vue Tooling for VS Code 🚀
- [vls](./server): Vue Language Server
- [vti](./vti): Vetur Terminal Interface
- [Docs](https://vuejs.github.io/vetur)

🎉 VueConf 2017 [Slide](https://www.dropbox.com/sh/eb4w8k3orh0j391/AAB3HaJexbGLa2tCP14BI8oJa?dl=0) & [Video](https://www.youtube.com/watch?v=05tNXJ-Kric) 🎉

💼 Sponsors
I quit my job to travel nomadically, to work on Open Source, and to conduct independent study/research.

Vetur is my main focus in Open Source. Your help will alleviate my financial burden and allow me to spend more time working on Vetur. Thank you 🙏

This should add a more personal and appreciative touch to your message.

https://github.com/sponsors/octref

Thanks🙏 to the following companies for supporting Vetur's development:

<table width="100%">
  <tr>
    <td>
      <a href="https://sponsorlink.codestream.com/?utm_source=vscmarket&amp;utm_campaign=vetur&amp;utm_medium=banner">
        <img src="https://alt-images.codestream.com/codestream_logo_vetur.png" width="250"/>
      </a>
    </td>
    <td>
      Request and perform code reviews from inside your IDE.  Review any code, even if it's a work-in-progress that hasn't been committed yet, and use jump-to-definition, your favorite keybindings, and other IDE tools.
      <a title="Try CodeStream" href="https://sponsorlink.codestream.com/?utm_source=vscmarket&amp;utm_campaign=vetur&amp;utm_medium=banner">Try it free</a>.
    </td>
  </tr>
  <tr>
    <td>
      <a href="https://bit.ly/3dlKf2Z">
        <img src="https://raw.githubusercontent.com/vuejs/vetur/master/asset/stepsize.png" width="250"/>
      </a>
    </td>
    <td>
      Track and prioritise tech debt and maintenance issues, straight from your IDE. Bookmark code while you work, organise TODOs and share codebase knowledge with your team.
      <a title="Try Stepsize" href="https://bit.ly/3dlKf2Z">Try it out for free today</a>.
    </td>
  </tr>
  <tr>
    <td>
      <a href="https://bloop.ai/?utm_source=vscmarket&utm_campaign=vetur&utm_medium=banner">
        <img src="https://user-images.githubusercontent.com/4033249/127679577-daf35b06-3458-4b2d-9772-03afdfaa088b.png" width="250"/>
      </a>
    </td>
    <td>
      Bored of trawling through the docs? Get JS and TS code examples from documentation and Open Source right in your IDE. <a href="https://bloop.ai/?utm_source=vscmarket&utm_campaign=vetur&utm_medium=banner">Learn more</a>.
    </td>
  </tr>
  <tr>
    <td>
      <a href="http://wd5a.2.vu/Vetur">
        <img src="https://user-images.githubusercontent.com/4033249/131348490-ba952c01-c4de-414a-b13a-cbe17014fc07.png" width="250"/>
      </a>
    </td>
    <td>
      <a href="http://wd5a.2.vu/Vetur">Tabnine</a> - Code Faster with the All-Language AI Assistant for Code Completion.
    </td>
  </tr>
</table>

## Features ✨

- [Syntax-highlighting](https://vuejs.github.io/vetur/guide/highlighting.html)
- [Semantic-highlighting](https://vuejs.github.io/vetur/guide/semantic-highlighting.html)
- [Snippet](https://vuejs.github.io/vetur/guide/snippet.html)
- [Emmet](https://vuejs.github.io/vetur/guide/emmet.html)
- [Linting / Error Checking](https://vuejs.github.io/vetur/guide/linting-error.html)
- [Formatting](https://vuejs.github.io/vetur/guide/formatting.html)
- [IntelliSense](https://vuejs.github.io/vetur/guide/intellisense.html)
- [Debugging](https://vuejs.github.io/vetur/guide/debugging.html)
- [Component Data](https://vuejs.github.io/vetur/guide/component-data.html): auto-completion and hover-information for popular Vue frameworks and your own custom components
- [Experimental Interpolation Features](https://vuejs.github.io/vetur/guide/interpolation.html): auto-completion, hover information and type-checking in Vue template
- [VTI](https://vuejs.github.io/vetur/guide/vti.html): Surface template type-checking errors on CLI
- [Global components](https://vuejs.github.io/vetur/guide/global-components.html): support define global components.

## 🚀 Quick Start

- Install [Vetur](https://marketplace.visualstudio.com/items?itemName=octref.vetur).
- Try it with [Veturpack](https://github.com/octref/veturpack).
- Refer to [setup](https://vuejs.github.io/vetur/guide/setup.html) page for setting up.
- Refer to each feature's own page for setting up specific features.

❓ Frequently Asked Questions

[FAQ](https://vuejs.github.io/vetur/guide/FAQ.html)

🚫 Limitations

- You can restart Vue language service when Vetur slow ([#2192](https://github.com/vuejs/vetur/issues/2192))
- yarn pnp (https://vuejs.github.io/vetur/guide/setup.html#yarn-pnp)

🛣️ Roadmap

See [#873](https://github.com/vuejs/vetur/issues/873).

🤝 Contribution

See [CONTRIBUTING.md](https://github.com/vuejs/vetur/blob/master/.github/CONTRIBUTING.md)

📜 License

MIT © [Pine Wu](https://github.com/octref) 
