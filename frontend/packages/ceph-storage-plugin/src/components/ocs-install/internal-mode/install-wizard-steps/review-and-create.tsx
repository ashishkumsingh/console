import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { TextContent, Text, TextVariants } from '@patternfly/react-core';
import { humanizeBinaryBytes } from '@console/internal/components/utils';
import { getName } from '@console/shared';
import { TotalCapacityText, OSD_CAPACITY_SIZES } from '../../../../utils/osd-size-dropdown';
import {
  ValidationType,
  ValidationMessage,
  getEncryptionLevel,
} from '../../../../utils/common-ocs-install-el';
import { getNodeInfo } from '../../../../utils/install';
import { InternalClusterState } from '../reducer';
import { MINIMUM_NODES, NetworkTypeLabels } from '../../../../constants';
import {
  ReviewListTitle,
  ReviewListBody,
  NodesCard,
  RequestErrors,
} from '../../install-wizard/review-and-create';
import { NetworkType } from '../../types';

export const ReviewAndCreate: React.FC<ReviewAndCreateProps> = ({
  state,
  errorMessage,
  inProgress,
}) => {
  const { t } = useTranslation();

  const {
    nodes,
    encryption,
    kms,
    capacity,
    enableMinimal,
    enableFlexibleScaling,
    storageClass,
    networkType,
    publicNetwork,
  } = state;
  const { cpu, memory, zones } = getNodeInfo(state.nodes);
  const scName = getName(storageClass);
  const emptyRequiredField =
    nodes.length < MINIMUM_NODES && !zones.size && !scName && !memory && !cpu;
  const osdSize = OSD_CAPACITY_SIZES[capacity];

  return (
    <>
      <TextContent className="ocs-install-wizard__text-content">
        <Text component={TextVariants.h2}>{t('ceph-storage-plugin~Review storage cluster')}</Text>
      </TextContent>
      <dl>
        <ReviewListTitle text={t('ceph-storage-plugin~Capacity and nodes')} />
        <ReviewListBody hideIcon>
          <Trans t={t} ns="ceph-storage-plugin" values={osdSize}>
            Requested Cluster Capacity:&nbsp;
            <span className="text-secondary">
              {{ osdSize }} TiB&nbsp;
              <TotalCapacityText capacity={capacity} />
            </span>
          </Trans>
        </ReviewListBody>
        <ReviewListBody
          noValue={!scName}
          validation={!scName && !emptyRequiredField && ValidationType.INTERNALSTORAGECLASS}
        >
          {t('ceph-storage-plugin~Storage Class:')}{' '}
          <span className="text-secondary">{scName ?? t('ceph-storage-plugin~None')}</span>
        </ReviewListBody>
        <ReviewListBody noValue={nodes.length < MINIMUM_NODES}>
          <div>
            <p>
              {t('ceph-storage-plugin~{{nodeCount, number}} node', {
                nodeCount: nodes.length,
                count: nodes.length,
              })}{' '}
              {t('ceph-storage-plugin~selected')}
            </p>
            <NodesCard nodes={nodes} />
          </div>
        </ReviewListBody>
        <ReviewListBody
          validation={enableMinimal && !emptyRequiredField && ValidationType.MINIMAL}
          noValue={!cpu || !memory}
        >
          <p>
            {t('ceph-storage-plugin~Total CPU and memory of {{cpu, number}} CPU and {{memory}}', {
              cpu,
              memory: humanizeBinaryBytes(memory).string,
            })}
          </p>
        </ReviewListBody>
        <ReviewListBody
          validation={enableFlexibleScaling && ValidationType.INTERNAL_FLEXIBLE_SCALING}
        >
          <p>
            {t('ceph-storage-plugin~{{zoneCount, number}} zone', {
              zoneCount: zones.size,
              count: zones.size,
            })}
          </p>
        </ReviewListBody>
        <ReviewListTitle text={t('ceph-storage-plugin~Configure')} />
        {(encryption.clusterWide || encryption.storageClass) && (
          <>
            <ReviewListBody noValue={!kms.hasHandled}>
              <p className="ocs-install-wizard__review-encryption">
                {t('ceph-storage-plugin~Enable Encryption')}
              </p>
              {encryption.advanced && (
                <p className="ocs-install-wizard__review-encryption">
                  {t('ceph-storage-plugin~Connect to external key management service: {{name}}', {
                    name: kms.name.value,
                  })}
                </p>
              )}
              <p>
                {t('ceph-storage-plugin~Encryption Level: {{level}}', {
                  level: getEncryptionLevel(encryption, t),
                })}
              </p>
            </ReviewListBody>
          </>
        )}
        <ReviewListBody
          validation={
            networkType === NetworkType.MULTUS && !publicNetwork && ValidationType.NETWORK
          }
        >
          <p>
            {t('ceph-storage-plugin~Using {{networkLabel}}', {
              networkLabel: NetworkTypeLabels[networkType],
            })}
          </p>
        </ReviewListBody>
      </dl>
      {emptyRequiredField && (
        <ValidationMessage
          className="ocs-install-wizard__review-alert"
          validation={ValidationType.ALLREQUIREDFIELDS}
        />
      )}
      <RequestErrors errorMessage={errorMessage} inProgress={inProgress} />
    </>
  );
};

type ReviewAndCreateProps = {
  errorMessage: string;
  inProgress: boolean;
  state: InternalClusterState;
};
