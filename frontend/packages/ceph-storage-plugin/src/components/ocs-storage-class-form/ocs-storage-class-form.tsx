import * as React from 'react';
import { useTranslation } from 'react-i18next';
import * as _ from 'lodash';
import {
  Alert,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownSeparator,
  FormGroup,
  Checkbox,
  Card,
  TextContent,
  TextList,
  TextListVariants,
  TextListItem,
  Button,
  Form,
  ActionGroup,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';

import { LoadingInline } from '@console/internal/components/utils/status-box';
import {
  useK8sWatchResource,
  WatchK8sResource,
} from '@console/internal/components/utils/k8s-watch-hook';
import { ProvisionerProps } from '@console/plugin-sdk';
import TechPreviewBadge from '@console/shared/src/components/badges/TechPreviewBadge';
import { ConfigMapKind, K8sResourceKind } from '@console/internal/module/k8s/types';
import { ButtonBar } from '@console/internal/components/utils/button-bar';
import { ConfigMapModel } from '@console/internal/models';

import {
  CEPH_INTERNAL_CR_NAME,
  CEPH_EXTERNAL_CR_NAME,
  CLUSTER_STATUS,
  CEPH_STORAGE_NAMESPACE,
} from '../../constants';
import { KMSConfigMapCSIName } from '../../constants/ocs-install';
import { cephBlockPoolResource, cephClusterResource } from '../../constants/resources';
import { CephClusterKind, StoragePoolKind } from '../../types';
import { storagePoolModal } from '../modals/storage-pool-modal/storage-pool-modal';
import { POOL_STATE } from '../../constants/storage-pool-const';
import { KMSConfigure } from '../kms-config/kms-config';
import { scReducer, scInitialState, SCActionType } from '../../utils/storage-pool';
import { KMSConfig, KMSConfigMap } from '../ocs-install/types';
import { createKmsResources, setEncryptionDispatch, parseURL } from '../kms-config/utils';
import './ocs-storage-class-form.scss';

export const PoolResourceComponent: React.FC<ProvisionerProps> = ({ onParamChange }) => {
  const { t } = useTranslation();

  const [poolData, poolDataLoaded, poolDataLoadError] = useK8sWatchResource<StoragePoolKind[]>(
    cephBlockPoolResource,
  );

  const [cephClusterObj, loaded, loadError] = useK8sWatchResource<CephClusterKind[]>(
    cephClusterResource,
  );

  const [isOpen, setOpen] = React.useState(false);
  const [poolName, setPoolName] = React.useState('');

  const handleDropdownChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const name = e.currentTarget.id;
    setPoolName(name);
    onParamChange(name);
  };

  const onPoolCreation = (name: string) => {
    setPoolName(name);
    onParamChange(name);
  };

  const onPoolInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPoolName(e.currentTarget.value);
    onParamChange(e.currentTarget.value);
  };

  const poolDropdownItems = _.reduce(
    poolData,
    (res, pool: StoragePoolKind) => {
      const compressionText =
        pool?.spec?.compressionMode === 'none' || pool?.spec?.compressionMode === ''
          ? t('ceph-storage-plugin~no compression')
          : t('ceph-storage-plugin~with compression');
      if (
        pool?.status?.phase === POOL_STATE.READY &&
        cephClusterObj[0]?.status?.phase === CLUSTER_STATUS.READY
      ) {
        res.push(
          <DropdownItem
            key={pool.metadata.uid}
            component="button"
            id={pool?.metadata?.name}
            onClick={handleDropdownChange}
            description={t('ceph-storage-plugin~Replica {{poolSize}} {{compressionText}}', {
              poolSize: pool?.spec?.replicated?.size,
              compressionText,
            })}
          >
            {pool?.metadata?.name}
          </DropdownItem>,
        );
      }
      return res;
    },
    [
      <DropdownItem
        key="first-item"
        component="button"
        onClick={() =>
          storagePoolModal({
            cephClusterObj,
            onPoolCreation,
          })
        }
      >
        {t('ceph-storage-plugin~Create New Pool')}
      </DropdownItem>,
      <DropdownSeparator key="separator" />,
    ],
  );

  if (cephClusterObj[0]?.metadata.name === CEPH_INTERNAL_CR_NAME) {
    return (
      <>
        {!poolDataLoadError && cephClusterObj && (
          <div className="form-group">
            <label className="co-required" htmlFor="ocs-storage-pool">
              {t('ceph-storage-plugin~Storage Pool')}
            </label>
            <Dropdown
              className="dropdown dropdown--full-width"
              toggle={
                <DropdownToggle
                  id="pool-dropdown-id"
                  onToggle={() => setOpen(!isOpen)}
                  toggleIndicator={CaretDownIcon}
                >
                  {poolName || t('ceph-storage-plugin~Select a Pool')}
                </DropdownToggle>
              }
              isOpen={isOpen}
              dropdownItems={poolDropdownItems}
              onSelect={() => setOpen(false)}
              id="ocs-storage-pool"
            />
            <span className="help-block">
              {t('ceph-storage-plugin~Storage pool into which volume data shall be stored')}
            </span>
          </div>
        )}
        {(poolDataLoadError || loadError) && (
          <Alert
            className="co-alert"
            variant="danger"
            title={t('ceph-storage-plugin~Error retrieving Parameters')}
            isInline
          />
        )}
      </>
    );
  }
  if (cephClusterObj[0]?.metadata.name === CEPH_EXTERNAL_CR_NAME) {
    return (
      <div className="form-group">
        <label className="co-required" htmlFor="ocs-storage-pool">
          {t('ceph-storage-plugin~Storage Pool')}
        </label>
        <input
          className="pf-c-form-control"
          type="text"
          onChange={onPoolInput}
          placeholder={t('ceph-storage-plugin~my-storage-pool')}
          aria-describedby={t('ceph-storage-plugin~pool-name-help')}
          id="pool-name"
          name="newPoolName"
          required
        />
        <span className="help-block">
          {t('ceph-storage-plugin~Storage pool into which volume data shall be stored')}
        </span>
      </div>
    );
  }
  return <>{(!loaded || !poolDataLoaded) && <LoadingInline />}</>;
};

const StorageClassEncryptionLabel: React.FC = () => (
  <div className="ocs-storageClass-encryption__pv-title">
    <span className="ocs-storageClass-encryption__pv-title--padding">Enable Encryption</span>
    <TechPreviewBadge />
  </div>
);

export const StorageClassEncryption: React.FC<ProvisionerProps> = ({ onParamChange }) => {
  const [state, dispatch] = React.useReducer(scReducer, scInitialState);
  const [checked, isChecked] = React.useState(false);
  const [editKMS, setEditKMS] = React.useState(false);
  const [validSave, setValidSave] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [progress, setInProgress] = React.useState(false);
  const [currentKMS, setCurrentKMS] = React.useState<KMSConfigMap>(null);

  const csiCMWatchResource: WatchK8sResource = {
    kind: ConfigMapModel.kind,
    namespaced: true,
    isList: false,
    namespace: CEPH_STORAGE_NAMESPACE,
    name: KMSConfigMapCSIName,
  };

  const [csiConfigMap, csiConfigMapLoaded, csiConfigMapLoadError] = useK8sWatchResource<
    ConfigMapKind
  >(csiCMWatchResource);

  React.useEffect(() => {
    if (!_.isEmpty(csiConfigMap)) {
      const serviceNames = Object.keys(csiConfigMap?.data);
      const kmsData = JSON.parse(csiConfigMap?.data[serviceNames[serviceNames.length - 1]]);
      setCurrentKMS(kmsData);
      const url = parseURL(kmsData.VAULT_ADDR);
      const kmsObj: KMSConfig = {
        name: {
          value: kmsData.KMS_SERVICE_NAME,
          valid: true,
        },
        address: {
          value: `${url.protocol}//${url.hostname}`,
          valid: true,
        },
        port: {
          value: url.port,
          valid: true,
        },
        backend: kmsData.VAULT_BACKEND_PATH,
        caCert: state.kms.caCert ?? null,
        caCertFile: state.kms.caCertFile,
        tls: kmsData.VAULT_TLS_SERVER_NAME,
        clientCert: state.kms.clientCert ?? null,
        clientCertFile: state.kms.clientCertFile,
        clientKey: state.kms.caCert ?? null,
        clientKeyFile: state.kms.clientKeyFile,
        providerNamespace: kmsData.VAULT_NAMESPACE,
        hasHandled: true,
      };
      setEncryptionDispatch(SCActionType.SET_KMS_ENCRYPTION, '', dispatch, kmsObj);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csiConfigMap, editKMS]);

  React.useEffect(() => {
    if (editKMS) {
      if (state.kms.name.valid && state.kms.address.valid && state.kms.port.valid) {
        setValidSave(true);
      } else {
        setValidSave(false);
      }
      setEncryptionDispatch(SCActionType.SET_KMS_ENCRYPTION, '', dispatch, state.kms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.kms.name.value,
    state.kms.address.value,
    state.kms.port.value,
    state.kms.name.valid,
    state.kms.address.valid,
    state.kms.port.valid,
  ]);

  const setChecked = (value: boolean) => {
    onParamChange(value.toString());
    isChecked(value);
  };

  const updateKMS = async () => {
    setInProgress(true);
    const allServiceNames = csiConfigMap ? Object.keys(csiConfigMap?.data) : [];
    if (
      (allServiceNames.length && allServiceNames.indexOf(state.kms.name.value) === -1) ||
      !csiConfigMap
    ) {
      try {
        const promises: Promise<K8sResourceKind>[] = createKmsResources(
          state.kms,
          editKMS,
          csiConfigMap?.data,
        );
        await Promise.all(promises).then(() => setEditKMS(false));
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setInProgress(false);
      }
    } else {
      setErrorMessage(`KMS service ${state.kms.name.value} already exist`);
    }
  };

  const cancelKMSUpdate = () => {
    editKMS ? setEditKMS(false) : isChecked(false);
    setErrorMessage('');
    setValidSave(true);
  };

  const KMSDetails: React.FC = () => (
    <div>
      <h3 className="help-block">
        Connection details{' '}
        <Button
          variant="link"
          onClick={() => {
            setEditKMS(true);
          }}
        >
          Change connection details
        </Button>
      </h3>
      <TextContent>
        <TextList component={TextListVariants.ul} className="ocs-storageClass-encryption__details">
          {currentKMS?.VAULT_NAMESPACE && (
            <TextListItem>
              Vault Enterprise Namespace:{' '}
              <span className="help-block ocs-storageClass-encryption__help-block">
                {currentKMS?.VAULT_NAMESPACE}
              </span>
            </TextListItem>
          )}
          <TextListItem>
            Key management service name:{' '}
            <span className="help-block ocs-storageClass-encryption__help-block">
              {currentKMS?.KMS_SERVICE_NAME}
            </span>
          </TextListItem>
          <TextListItem>
            Provider:{' '}
            <span className="help-block ocs-storageClass-encryption__help-block">
              {currentKMS?.KMS_PROVIDER}
            </span>
          </TextListItem>
          <TextListItem>
            Address and Port:{' '}
            <span className="help-block ocs-storageClass-encryption__help-block">
              {currentKMS?.VAULT_ADDR}
            </span>
          </TextListItem>
          {currentKMS?.VAULT_CACERT && (
            <TextListItem>
              CA certificate:{' '}
              <span className="help-block ocs-storageClass-encryption__help-block">Provided</span>
            </TextListItem>
          )}
        </TextList>
      </TextContent>
    </div>
  );

  return (
    <Form>
      <FormGroup
        fieldId="storage-class-encryption"
        helperTextInvalid="This is a required field"
        isRequired
      >
        <Checkbox
          id="storage-class-encryption"
          isChecked={checked}
          label={<StorageClassEncryptionLabel />}
          aria-label="Storage class encryption"
          description="An encryption key for each Persistent volume (block only) will be generated."
          onChange={setChecked}
          className="ocs-storageClass-encryption__form-checkbox"
        />

        {checked && (
          <>
            <Card isFlat className="ocs-storageClass-encryption__card">
              {(!csiConfigMapLoaded || progress) && <LoadingInline />}
              {csiConfigMapLoaded && csiConfigMap && !editKMS && !csiConfigMapLoadError ? (
                <KMSDetails />
              ) : (
                <>
                  <KMSConfigure
                    state={state}
                    dispatch={dispatch}
                    className="ocs-storageClass-encryption"
                  />
                  <div className="ocs-install-kms__save-button">
                    <ButtonBar errorMessage={errorMessage} inProgress={progress}>
                      <ActionGroup>
                        <Button variant="secondary" onClick={updateKMS} isDisabled={!validSave}>
                          Save
                        </Button>
                        <Button variant="plain" onClick={cancelKMSUpdate}>
                          Cancel
                        </Button>
                      </ActionGroup>
                    </ButtonBar>
                  </div>
                </>
              )}
            </Card>
            <Alert
              className="co-alert"
              variant="warning"
              title="Encrypted PVs cannot be cloned, expanded or create snapshots."
              aria-label="The last saved values will be updated"
              isInline
            />
          </>
        )}
      </FormGroup>
    </Form>
  );
};

export const StorageClassEncryptionKMSID: React.FC<ProvisionerProps> = ({ onParamChange }) => {
  const csiCMWatchResource: WatchK8sResource = {
    kind: ConfigMapModel.kind,
    namespaced: true,
    isList: false,
    namespace: CEPH_STORAGE_NAMESPACE,
    name: KMSConfigMapCSIName,
  };

  const [csiConfigMap, csiConfigMapLoaded] = useK8sWatchResource<ConfigMapKind>(csiCMWatchResource);

  React.useEffect(() => {
    if (csiConfigMapLoaded && csiConfigMap) {
      const serviceNames: string[] = Object.keys(csiConfigMap?.data);
      const targetServiceName: string = serviceNames[serviceNames.length - 1];
      onParamChange(targetServiceName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csiConfigMap]);

  return <></>;
};
