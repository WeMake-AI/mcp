// Define Config
export type Config = {
  coverage: {
    statements: number;
    functions: number;
    lines: number;
  };
  retries: {
    unit: number;
    integration: number;
    e2e: number;
  };
  performance: {
    timeout: number;
    memoryLimit: string;
    benchmarkIterations: number;
  };
  security: {
    vulnerabilityThreshold: "low" | "moderate" | "high" | "critical";
    licenseCheck: boolean;
    secretScanning: boolean;
  };
  parallel: {
    workers: "auto" | number;
    maxWorkers: number;
  };
};

export const testConfig: Config = {
  // Coverage thresholds aligned with enterprise standards
  coverage: {
    statements: 90,
    functions: 80,
    lines: 70
  },

  // Self-healing test settings
  retries: {
    unit: 2,
    integration: 3,
    e2e: 3
  },

  // Performance benchmarking
  performance: {
    timeout: 30000,
    memoryLimit: "512MB",
    benchmarkIterations: 100
  },

  // Security scanning
  security: {
    vulnerabilityThreshold: "moderate",
    licenseCheck: true,
    secretScanning: true
  },

  // Parallel execution
  parallel: {
    workers: "auto",
    maxWorkers: 8
  }
};
