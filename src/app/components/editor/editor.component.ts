import {
  Component, ViewChild, ChangeDetectorRef,
  Input, ContentChild, TemplateRef, OnChanges
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatInput } from '@angular/material';
import { of } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';
import * as _ from 'lodash';

import * as appStore from 'store';
import { Alert } from 'store/actions/common.actions';
import { ConfigurationChange } from 'store/actions/editor.actions';

import { percyConfig } from 'config';

import { TreeNode } from 'models/tree-node';
import { Configuration } from 'models/config-file';
import { ConfigProperty } from 'models/config-property';
import { NotEmpty } from 'services/validators';

import { NestedConfigViewComponent } from 'components/nested-config-view/nested-config-view.component';
import { YamlService } from 'services/yaml.service';

/*
  Configurations editor page
  for both editing existing files and adding new ones
 */
@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnChanges {
  @Input()
  appName: string;
  @Input()
  fileName: string;
  @Input()
  editMode = false;
  @Input()
  envFileMode = false;
  @Input()
  environments: string[];
  @Input()
  configuration: Configuration;

  showAsCode: boolean;
  previewCode: string;
  selectedNode: TreeNode;
  showAsCompiledYAMLEnvironment: string;
  currentConfigProperty: ConfigProperty;

  @ContentChild('buttonsTemplate') buttonsTemplate: TemplateRef<any>;
  @ViewChild('nestedConfig') nestedConfig: NestedConfigViewComponent;

  filename = new FormControl('', [NotEmpty, Validators.pattern(percyConfig.filenameRegex)]);
  fileNameInput: MatInput;

  @ViewChild('fileNameInput')
  set _fileNameInput(_input: MatInput) {
    const first = !this.fileNameInput && _input;
    this.fileNameInput = _input;

    if (!this.filename.value && this.filename.enabled && first) {
      setImmediate(() => {
        this.fileNameInput.focus();
      });
    }
  }

  /**
   * creates the component
   * @param route the route
   * @param store the app store instance
   * @param dialog the mat dialog service
   * @param yamlService the yaml service
   */
  constructor(
    private store: Store<appStore.AppState>,
    private yamlService: YamlService,
    private ref: ChangeDetectorRef,
  ) { }

  /**
   * Initializes the component.
   */
  ngOnChanges() {
    if (this.fileName) {
      this.filename.setValue(this.fileName);
      this.filename.disable();
    } else {
      this.filename.setValue('');
      this.filename.enable();
    }
    this.reset();
  }

  /**
   * File name change handler.
   */
  fileNameChange() {
    if (!this.editMode) {
      if (this.filename.invalid) {
        return;
      }

      // Check whether the file name already exists
      this.store.pipe(select(appStore.backendState), take(1), tap((backendState) => {
        if (_.find(backendState.files.entities, { fileName: this.getFileName(), applicationName: this.appName })) {
          this.filename.setErrors({ alreadyExists: true });
        } else {
          this.filename.setErrors(undefined);
        }
      })).subscribe();
    }
  }

  /**
   * Get normalized file name.
   * @returns normalized file name.
   */
  getFileName() {
    const name = _.trim(this.filename.value);
    return name.match(/\.[y|Y][a|A]?[m|M][l|L]$/) ? name : name + '.yaml';
  }

  /**
   * Validate before save/commit.
   * @return validation result.
   */
  validate() {
    // check the file name
    if (!this.editMode && this.filename.invalid) {
      this.fileNameInput.focus();
      return of({ editorState: null, valid: false });
    }

    return this.store.pipe(select(appStore.editorState), take(1), map((editorState) => {

      // verify yaml
      try {
        this.yamlService.convertTreeToYaml(editorState.configuration);
        _.forEach(editorState.configuration.environments.children, (envNode) => {
          this.yamlService.compileYAML(envNode.key, editorState.configuration);
        });
      } catch (err) {
        this.store.dispatch(new Alert({ message: `YAML validation failed:\n${err.message}`, alertType: 'error' }));
        return { editorState, valid: false };
      }

      return { editorState, valid: true };
    }));
  }

  /**
   * Handles the configuration change.
   * @param configuration the new configuration
   */
  onConfigChange(configuration) {
    this.store.dispatch(new ConfigurationChange(configuration));
  }

  /**
   * Reset UI elements.
   */
  private reset() {
    this.showAsCode = false;
    this.previewCode = null;
    this.selectedNode = null;
    this.showAsCompiledYAMLEnvironment = null;
    this.currentConfigProperty = null;
  }

  /**
   * Handles the node selected request to show the detail.
   * @param node the selected node
   */
  onNodeSelected(node: TreeNode) {
    this.reset();

    this.selectedNode = node;
    this.showAsCode = !node.isLeaf();

    if (this.showAsCode) {
      const tree = new TreeNode('');
      tree.children.push(node);
      try {
        // Don't validate here since the node is a partial of tree
        // , the anchor alias will always fail to validate if any
        // But we'll validate when saving the whole config
        this.previewCode = this.yamlService.convertTreeToYaml(tree, false);
      } catch (err) {
        this.store.dispatch(new Alert({ message: err.message, alertType: 'error' }));
      }
    }
  }

  /**
   * Handles the open add/edit property request.
   * @param property the property to add/edit
   */
  onAddEditProperty(property: ConfigProperty) {
    this.reset();
    this.ref.detectChanges();
    this.currentConfigProperty = property;
  }

  /**
   * Handles the cancel add/edit property request.
   */
  onCancelAddEditProperty() {
    this.reset();
  }

  /**
   * Handles the save add/edit property request.
   */
  onSaveAddEditProperty(node: TreeNode) {
    this.nestedConfig.saveAddEditProperty(node);
    this.reset();
  }

  /**
   * Handles the edit node request.
   * @param node the node to edit
   */
  openEditPropertyDialog(node: TreeNode) {
    this.nestedConfig.openEditPropertyDialog(node);
  }

  /**
   * Handles the compiled YAML view request.
   * @param environment the environment to compile its yaml
   */
  showCompiledYAML(environment: string) {
    this.store.pipe(select(appStore.editorState), take(1), tap(editorState => {
      try {
        const compiledYAML = this.yamlService.compileYAML(environment, editorState.configuration);
        this.reset();
        this.showAsCompiledYAMLEnvironment = environment;
        this.previewCode = compiledYAML;
      } catch (err) {
        this.store.dispatch(new Alert({ message: err.message, alertType: 'error' }));
      }
    })).subscribe();
  }

}