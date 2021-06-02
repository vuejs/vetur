module.exports = {
  title: 'Vetur',
  description: 'Vue tooling for VS Code.',
  base: '/vetur/',
  markdown: {
    linkify: true
  },
  themeConfig: {
    repo: 'vuejs/vetur',
    editLinks: true,
    docsDir: 'docs',
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'FAQ', link: '/guide/FAQ' },
      { text: 'Roadmap', link: 'https://github.com/vuejs/vetur/issues/873' },
      { text: 'Credits', link: '/credits' },
      { text: 'Contribution Guide', link: 'https://github.com/vuejs/vetur/wiki#contribution-guide' }
    ],
    sidebar: {
      '/guide/': [
        '',
        'setup',
        {
          title: 'Features',
          collapsable: false,
          children: [
            'highlighting',
            'semantic-highlighting',
            'snippet',
            'emmet',
            'linting-error',
            'formatting',
            'intellisense',
            'debugging',
            'component-data',
            'interpolation',
            'vti',
            'global-components'
          ]
        },
        'FAQ'
      ],
      '/reference/': ['', 'tsconfig']
    }
  }
};
