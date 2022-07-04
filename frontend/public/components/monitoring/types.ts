import {
  Alert,
  AlertSeverity,
  AlertStates,
  PrometheusLabels,
  PrometheusRule,
  Rule,
  RuleStates,
  Silence,
  SilenceStates,
} from '@console/dynamic-plugin-sdk';

import { RowFunctionArgs } from '../factory';
import { RowFilter } from '../filter-toolbar';

export {
  SilenceStates,
  AlertSeverity,
  RuleStates,
  AlertStates,
};

// prettier 1.x doesn't support TS 3.8 syntax
// eslint-disable-next-line prettier/prettier
export type {
  Alert,
  Rule,
  Silence,
}

export const enum AlertSource {
  Platform = 'platform',
  User = 'user',
}

export type MonitoringResource = {
  abbr: string;
  kind: string;
  label: string;
  plural: string;
};

export type Silences = {
  data: Silence[];
  loaded: boolean;
  loadError?: string | Error;
};

export type Alerts = {
  data: Alert[];
  loaded: boolean;
  loadError?: string | Error;
};

export type Rules = {
  data: Rule[];
  loaded: boolean;
  loadError?: string | Error;
};

type Group = {
  rules: PrometheusRule[];
  file: string;
  name: string;
};

export type PrometheusAPIError = {
  json: {
    error?: string;
  };
  message?: string;
  response: {
    status: number;
  };
};

export type PrometheusRulesResponse = {
  data: {
    groups: Group[];
  };
  status: string;
};

export type ListPageProps = {
  CreateButton?: React.ComponentType<{}>;
  data: Alert[] | Rule[] | Silence[];
  defaultSortField: string;
  Header: (...args) => any[];
  hideLabelFilter?: boolean;
  kindPlural: string;
  labelFilter?: string;
  labelPath?: string;
  loaded: boolean;
  loadError?: any;
  nameFilterID: string;
  reduxID: string;
  Row: React.FC<RowFunctionArgs>;
  rowFilters: RowFilter[];
  showTitle?: boolean;
  TopAlert?: React.ReactNode
};

export type Target = {
  discoveredLabels: PrometheusLabels;
  globalUrl: string;
  health: 'up' | 'down';
  labels: PrometheusLabels;
  lastError: string;
  lastScrape: string;
  lastScrapeDuration: number;
  scrapePool: string;
  scrapeUrl: string;
};
