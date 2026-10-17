// Team. salary pro Woche (steigt mit den Jahren, siehe ECONOMY.salaryGrowth).

export const STAFF = {
  researcher: {
    name: 'Researcher', icon: '🔬', salary: 1200,
    desc: '+6 Forschungspunkte pro Woche (× Schwierigkeit)',
  },
  ml: {
    name: 'ML-Engineer', icon: '🧑‍💻', salary: 1000,
    desc: '−Absturz- & Spike-Risiko, +1,5 % Compute-Auslastung (max. +15 %)',
  },
  infra: {
    name: 'Infra-Engineer', icon: '🔧', salary: 1100,
    desc: '+1 % Cluster-Effizienz (max. +8 %), −10 % GPU-Defekte (max. −60 %)',
  },
  data: {
    name: 'Data-Engineer', icon: '🧹', salary: 900,
    desc: '+0,01 Daten-Qualität (max. +0,08)',
  },
  sales: {
    name: 'Sales', icon: '🤝', salary: 800,
    desc: '+4 % Auftragswert (max. +60 %), mehr offene Aufträge',
  },
};

export const STAFF_FX = {
  mlUtil: 0.015, mlUtilCap: 0.15, mlRisk: 0.08, mlRiskCap: 0.6,
  infraCluster: 0.01, infraClusterCap: 0.08, infraDefect: 0.1, infraDefectCap: 0.6,
  dataQuality: 0.01, dataQualityCap: 0.08,
  salesReward: 0.04, salesRewardCap: 0.6, salesSlotsPer: 2, salesSlotsCap: 4,
};
