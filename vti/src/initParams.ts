export const params = {
  /**
   * Doesn't matter as long as its positive
   */
  processId: 1,
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
