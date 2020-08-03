export const params = {
  capabilities: {},
  initializationOptions: {
    config: {
      vetur: {
        validation: {
          template: true,
          style: false,
          script: false
        },
        experimental: {
          templateInterpolationService: true
        }
      }
    }
  }
};
