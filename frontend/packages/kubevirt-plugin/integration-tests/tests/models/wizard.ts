/* eslint-disable no-await-in-loop */
import { browser, ExpectedConditions as until } from 'protractor';
import { isLoaded } from '@console/internal-integration-tests/views/crud.view';
import { clickNavLink } from '@console/internal-integration-tests/views/sidenav.view';
import { click, fillInput, asyncForEach } from '@console/shared/src/test-utils/utils';
import { K8sKind } from '@console/internal/module/k8s';
import {
  selectOptionByText,
  enabledAsBoolean,
  selectItemFromDropdown,
  selectAccessModeFromCM,
  getResourceUID,
  checkForError,
} from '../utils/utils';
import {
  CloudInitConfig,
  Disk,
  Network,
  FlavorConfig,
  VirtualMachineTemplateModel,
} from '../types/types';
import {
  WIZARD_CREATE_SUCCESS,
  PAGE_LOAD_TIMEOUT_SECS,
  KEBAP_ACTION,
  VIRTUALIZATION_TITLE,
  SEC,
  STORAGE_CLASS,
} from '../utils/constants/common';
import { AccessMode, VolumeMode } from '../mocks/mocks';
import { NetworkInterfaceDialog } from '../dialogs/networkInterfaceDialog';
import { DiskDialog } from '../dialogs/diskDialog';
import { Flavor, StepTitle, TemplateByName } from '../utils/constants/wizard';
import * as view from '../../views/wizard.view';
import { resourceHorizontalTab, dropDownItem, dropDownItemMain } from '../../views/uiResource.view';
import { saveButton } from '../../views/kubevirtUIResource.view';
import { confirmActionButton } from '../../views/importWizard.view';
import { virtualizationTitle } from '../../views/vms.list.view';
import { diskStorageClass } from '../../views/dialogs/diskDialog.view';
import { templateCreateVMLink } from '../../views/template.view';
import { VMBuilderData } from '../types/vm';
import { ProvisionSource } from '../utils/constants/enums/provisionSource';
import { TemplateModel } from '@console/internal/models';

export class Wizard {
  async openWizard(
    model: K8sKind = null,
    customize: boolean = false,
    template: string = TemplateByName.RHEL7,
  ) {
    if (
      !(await virtualizationTitle.isPresent()) ||
      (await virtualizationTitle.getText()) !== VIRTUALIZATION_TITLE
    ) {
      await clickNavLink(['Workloads', 'Virtualization']);
      await isLoaded();
    }
    if (model === VirtualMachineTemplateModel) {
      await click(resourceHorizontalTab(VirtualMachineTemplateModel));
      await isLoaded();
    }

    await click(view.createItemButton);
    await click(view.createWithWizardButton);
    await view.waitForNoLoaders();

    if (customize) {
      await this.selectTemplate(template);
      await this.next();
      await click(view.customizeButton);
    }
  }

  async openVMFromTemplateWizard(templateSourceName: string, namespace: string) {
    await click(resourceHorizontalTab(VirtualMachineTemplateModel));
    await isLoaded();
    const uid = getResourceUID(TemplateModel.kind, templateSourceName, namespace);
    await click(templateCreateVMLink(uid));
  }

  async closeWizard() {
    await click(view.cancelButton);
    await browser
      .switchTo()
      .alert()
      .accept();
  }

  async next(ignoreWarnings: boolean = false) {
    await click(view.nextButton);
    if (!ignoreWarnings) {
      try {
        await browser.wait(until.presenceOf(view.footerError), 1 * SEC);
      } catch (e) {
        // footerError wasn't displayed, everything is OK
        return;
      }
      // An error is displayed
      throw new Error(await view.footerErrorDescroption.getText());
    }
  }

  async selectTemplate(name: string) {
    await click(view.templateByName(name));
  }

  async fillName(name: string) {
    await fillInput(view.nameInput, name);
    return checkForError(view.vmNameHelper);
  }

  async fillDescription(description: string) {
    await fillInput(view.descriptionInput, description);
  }

  async selectOperatingSystem(operatingSystem: string) {
    await selectItemFromDropdown(view.operatingSystemSelect, dropDownItem(operatingSystem));
  }

  async selectFlavor(flavor: FlavorConfig) {
    await selectItemFromDropdown(view.flavorSelect, dropDownItem(flavor.flavor));
    if (flavor.flavor === Flavor.CUSTOM && (!flavor.memory || !flavor.cpu)) {
      throw Error('Custom Flavor requires memory and cpu values.');
    }
    if (flavor.memory) {
      await fillInput(view.customFlavorMemoryInput, flavor.memory);
    }
    if (flavor.cpu) {
      await fillInput(view.customFlavorCpusInput, flavor.cpu);
    }
  }

  async selectWorkloadProfile(workloadProfile: string) {
    await selectItemFromDropdown(view.workloadProfileSelect, dropDownItemMain(workloadProfile));
  }

  async disableGoldenImageCloneCheckbox() {
    try {
      await browser.wait(until.presenceOf(view.goldenImageCloneCheckbox), 1000);
      if (
        (await view.goldenImageCloneCheckbox.isPresent()) &&
        (await view.goldenImageCloneCheckbox.isSelected())
      ) {
        await click(view.goldenImageCloneCheckbox);
      }
    } catch {
      // nothing
    }
  }

  async selectProvisionSource(provisionSource: ProvisionSource) {
    await selectItemFromDropdown(
      view.provisionSourceSelect,
      dropDownItemMain(provisionSource.getDescription()),
    );
    if (provisionSource.getSource()) {
      await fillInput(
        view.provisionSourceInputs[provisionSource.getValue()],
        provisionSource.getSource(),
      );
    }
  }

  async startOnCreation(startOnCreation: boolean) {
    if (startOnCreation) {
      if (!view.startVMOnCreation.isSelected()) {
        await click(view.startVMOnCreation);
      }
    }
    if (!startOnCreation) {
      if (view.startVMOnCreation.isSelected()) {
        await click(view.startVMOnCreation);
      }
    }
  }

  async configureCloudInit(cloudInitOptions: CloudInitConfig) {
    if (cloudInitOptions.useCustomScript) {
      await click(view.cloudInitCustomScriptCheckbox);
      await fillInput(view.customCloudInitScriptTextArea, cloudInitOptions.customScript);
    } else {
      await click(view.cloudInitFirstOption);
      await click(confirmActionButton);
      await fillInput(view.cloudInitHostname, cloudInitOptions.hostname || '');
      await asyncForEach(cloudInitOptions.sshKeys, async (sshKey: string, index: number) => {
        await fillInput(view.cloudInitSSHKey(index + 1), sshKey);
        await click(view.cloudInitAddKeyButton);
      });
    }
  }

  async addNIC(nic: Network) {
    await click(view.addNICButton);
    const addNICDialog = new NetworkInterfaceDialog();
    await addNICDialog.create(nic);
    // const err = await addNICDialog.create(nic);
  }

  /**
   * Edits attributes of a NIC.
   * @param   {string}              name     Name of a NIC to edit.
   * @param   {Network}     NIC      NIC with the requested attributes.
   */
  async editNIC(name: string, NIC: Network) {
    await view.clickKebabAction(name, KEBAP_ACTION.Edit);
    const addNICDialog = new NetworkInterfaceDialog();
    await addNICDialog.edit(NIC);
  }

  async selectBootableNIC(networkDefinition: string) {
    await selectOptionByText(view.pxeBootSourceSelect, networkDefinition);
  }

  async selectBootableDisk(diskName: string) {
    await selectOptionByText(view.storageBootSourceSelect, diskName);
  }

  async addDisk(disk: Disk) {
    await click(view.addDiskButton);
    const addDiskDialog = new DiskDialog();
    await addDiskDialog.create(disk);
  }

  /**
   * Edits attributes of a disk.
   * @param   {string}              name     Name of a disk to edit.
   * @param   {Disk}     disk     Disk with the requested attributes.
   */
  async editDisk(name: string, disk: Disk) {
    await view.clickKebabAction(name, KEBAP_ACTION.Edit);
    const addDiskDialog = new DiskDialog();
    await addDiskDialog.edit(disk);
  }

  async setRootDiskStorageOptions() {
    await view.clickKebabAction('rootdisk', KEBAP_ACTION.Edit);
    const diskDialog = new DiskDialog();
    if (await diskStorageClass.isPresent()) {
      await diskDialog.selectStorageOptions();
    }

    await click(saveButton);
    await view.waitForNoLoaders();
  }

  async validateReviewTab(data) {
    expect(await view.nameReviewValue.getText()).toEqual(data.name);
    if (data.description) {
      expect(await view.descriptionReviewValue.getText()).toEqual(data.description);
    }
    if (data.operatingSystem) {
      expect(await view.osReviewValue.getText()).toEqual(data.operatingSystem);
    }
    if (data.flavorConfig) {
      expect(await view.flavorReviewValue.getText()).toContain(data.flavorConfig.flavor);
    }
    if (data.workloadProfile) {
      expect(await view.workloadProfileReviewValue.getText()).toEqual(data.workloadProfile);
    }
    if (data.cloudInit?.useCloudInit) {
      expect(enabledAsBoolean(await view.cloudInitReviewValue.getText())).toEqual(
        data.cloudInit.useCloudInit,
      );
    }
  }

  async confirmAndCreate() {
    await click(view.createVirtualMachineButton);
  }

  async waitForCreation() {
    await browser.wait(
      until.textToBePresentInElement(view.creationSuccessResult, WIZARD_CREATE_SUCCESS),
      PAGE_LOAD_TIMEOUT_SECS,
    );
  }

  async processSelectTemplate(data: VMBuilderData, ignoreWarnings: boolean = false) {
    const { selectTemplateName } = data;
    await this.selectTemplate(selectTemplateName);
    await this.next(ignoreWarnings);
  }

  async processBootSource(data: VMBuilderData, ignoreWarnings: boolean = false) {
    const { provisionSource, namespace, pvcName } = data;
    const accessModeLabel = selectAccessModeFromCM(AccessMode).label;
    if (provisionSource) {
      await this.selectProvisionSource(provisionSource);
      if (provisionSource === ProvisionSource.DISK) {
        await selectItemFromDropdown(view.pvcNSButton, view.pvcNS(namespace));
        await selectItemFromDropdown(view.pvcNameButton, view.pvcName(pvcName));
      }
    } else {
      throw Error('Provision souce not defined');
    }

    await click(view.diskAdvance);
    await selectItemFromDropdown(view.selectSCButton, dropDownItem(STORAGE_CLASS));
    await selectItemFromDropdown(view.selectAccessModeButton, dropDownItem(accessModeLabel));
    await selectItemFromDropdown(view.selectVolumeModeButton, dropDownItem(VolumeMode));

    await this.next(ignoreWarnings);
  }

  async processReviewAndCreate(data: VMBuilderData) {
    const { name, startOnCreation } = data;
    if (name) {
      await this.fillName(name);
    }

    await this.startOnCreation(startOnCreation);
    await this.confirmAndCreate();
  }

  async processGeneralStep(data: VMBuilderData, ignoreWarnings: boolean = false) {
    const { name, namespace, description, provisionSource, os, flavor, workload, pvcName } = data;
    if (name) {
      await this.fillName(name);
    } else {
      throw Error('VM Name not defined');
    }
    if (description) {
      await this.fillDescription(description);
    }
    if ((await browser.getCurrentUrl()).match(/\?template=.+$/)) {
      // We are creating a VM from template via its action button
      // ProvisionSource, OS and workload are prefilled and disabled - ignoring them
    } else {
      if (os) {
        await this.selectOperatingSystem(os);
      } else {
        throw Error('VM OS not defined');
      }

      if (provisionSource) {
        await this.disableGoldenImageCloneCheckbox();
        await this.selectProvisionSource(provisionSource);
        if (provisionSource === ProvisionSource.DISK) {
          await selectItemFromDropdown(view.selectPVCNS, view.pvcNS(namespace));
          await selectItemFromDropdown(view.selectPVCName, view.pvcName(pvcName));
        }
      }

      if (workload) {
        await this.selectWorkloadProfile(workload);
      } else {
        throw Error('VM Workload not defined');
      }
    }

    if (flavor) {
      await this.selectFlavor(flavor);
    } else {
      throw Error('VM Flavor not defined');
    }
    await this.next(ignoreWarnings);
  }

  async processNetworkStep(data: VMBuilderData) {
    const { networks, provisionSource, template } = data;
    for (const resource of networks) {
      await this.addNIC(resource);
    }
    if (provisionSource === ProvisionSource.PXE && template === undefined) {
      // Select the last NIC as the source for booting
      await this.selectBootableNIC(networks[networks.length - 1].name);
    }
    await this.next();
  }

  async processStorageStep(data: VMBuilderData) {
    const { disks, provisionSource } = data;
    for (const disk of disks) {
      if (await view.tableRow(disk.name).isPresent()) {
        await this.editDisk(disk.name, disk);
      } else {
        await this.addDisk(disk);
      }

      if (provisionSource === ProvisionSource.DISK && disk.bootable) {
        await this.selectBootableDisk(disk.name);
      }
    }

    // set rootdisk storage options
    await this.setRootDiskStorageOptions();

    await this.next();
  }

  async processAdvanceStep(data: VMBuilderData) {
    const { cloudInit } = data;
    if (cloudInit) {
      await this.configureCloudInit(cloudInit);
    }
    await this.next();
  }

  async processReviewStep(data: VMBuilderData) {
    const { startOnCreation } = data;
    await this.startOnCreation(startOnCreation);
    await this.validateReviewTab(data);
  }

  async processWizard(data: VMBuilderData) {
    await browser.wait(until.presenceOf(view.wizardBody), 5 * SEC);

    if ((await view.stepTitle.getText()) === StepTitle.SelectATemplate) {
      await this.processSelectTemplate(data);
    }
    const { customize } = data;
    if (customize) {
      await click(view.customizeButton);
      await this.processGeneralStep(data);
      await this.processNetworkStep(data);
      await this.processStorageStep(data);
      await this.processAdvanceStep(data);
      await this.processReviewStep(data);

      // Create
      await this.confirmAndCreate();
      await this.waitForCreation();
    }
    if ((await view.stepTitle.getText()) === StepTitle.BootSource) {
      await this.processBootSource(data);
    }
    if ((await view.stepTitle.getText()) === StepTitle.ReviewAndCreate) {
      await this.processReviewAndCreate(data);
      await this.waitForCreation();
    }
  }
}
