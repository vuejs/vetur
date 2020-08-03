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
    sidebar: [
      '/setup',
      {
        title: 'Features',
        collapsable: false,
        children: [
          '/highlighting',
          '/snippet',
          '/emmet',
          '/linting-error',
          '/formatting',
          '/intellisense',
          '/debugging',
          '/framework',
          '/interpolation',
          '/vti'
        ]
      },
      '/FAQ',
      '/CONTRIBUTING',
      '/roadmap',
      '/CHANGELOG',
      '/credits'
    ]
  }
};
