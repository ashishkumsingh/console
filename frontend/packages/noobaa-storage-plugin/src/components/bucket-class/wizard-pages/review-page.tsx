import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Title } from '@patternfly/react-core';
import { LoadingInline } from '@console/internal/components/utils';
import { getName } from '@console/shared';
import { State } from '../state';

const ReviewPage: React.FC<ReviewPageProps> = ({ state }) => {
  const {
    bucketClassName,
    description,
    tier1BackingStore,
    tier2BackingStore,
    tier1Policy,
    tier2Policy,
  } = state;
  const { error, isLoading } = state;
  const { t } = useTranslation();

  return (
    <div className="nb-create-bc-step-page">
      <Title size="xl" headingLevel="h2">
        {t('noobaa-storage-plugin~Review and confirm Bucket Class settings')}
      </Title>
      <div className="nb-create-bc-step-page-review__item">
        <Title size="lg" headingLevel="h4" className="nb-create-bc-step-page-review__item-header">
          {t('noobaa-storage-plugin~Bucket Class name')}
        </Title>
        <p data-testid="bc-name">{bucketClassName}</p>
      </div>
      {description && (
        <div className="nb-create-bc-step-page-review__item">
          <Title size="lg" headingLevel="h4" className="nb-create-bc-step-page-review__item-header">
            {t('noobaa-storage-plugin~Description')}
          </Title>
          <p data-testid="bc-desc">{description}</p>
        </div>
      )}
      <div className="nb-create-bc-step-page-review__item">
        <Title size="lg" headingLevel="h4" className="nb-create-bc-step-page-review__item-header">
          {t('noobaa-storage-plugin~Placement Policy Details')}
        </Title>
        <div className="co-nobaa-create-bc-step-page-review__item-tier1">
          <Title size="md" headingLevel="h5" data-testid="tier1-policy">
            {t('noobaa-storage-plugin~Tier 1: {{tier1Policy}}', { tier1Policy })}
          </Title>
          <p data-testid="tier1-stores">
            {t('noobaa-storage-plugin~Selected Backing Store:')}{' '}
            {tier1BackingStore.map(getName).join(', ')}
          </p>
        </div>
        {tier2Policy && (
          <>
            <Title size="md" headingLevel="h5" data-testid="tier2-policy">
              {t('noobaa-storage-plugin~Tier 2:')} {tier2Policy}
            </Title>
            <p data-testid="tier2-stores">
              {t('noobaa-storage-plugin~Selected Backing Store:')}{' '}
              {tier2BackingStore.map(getName).join(', ')}
            </p>
          </>
        )}
      </div>
      {isLoading && <LoadingInline />}
      {!!error && (
        <Alert variant="danger" title="Error" isInline>
          {error}
        </Alert>
      )}
    </div>
  );
};

export default ReviewPage;

type ReviewPageProps = {
  state: State;
};
