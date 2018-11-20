import { Router, ActivatedRoute } from '@angular/router';
import { Type, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Observable, isObservable, BehaviorSubject, Subscription } from 'rxjs';
import { Store, StoreModule, Action } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { TestCtx, createTestContext, configureTestSuite } from 'ng-bullet';

import { User } from 'models/auth';
import { reducers } from 'store';
import { AppEffects } from 'store/affects/app.effects';
import { AuthEffects } from 'store/affects/auth.effects';
import { BackendEffects } from 'store/affects/backend.effects';
import { EditorEffects } from 'store/affects/editor.effects';
import { DashboardEffects } from 'store/affects/dashboard.effects';

import { InitializerDirective } from 'directives/initializer.directive';
import { MaterialComponentsModule } from 'material-components/material-components.module';

import * as _ from 'lodash';

declare var beforeEach: (any) => any;
declare var afterEach: (any) => any;

export const TestUser: User = {
  username: 'test-user',
  repositoryUrl: 'https://test.com/repo',
  branchName: 'admin',
  token: 'test-token',
  repoName: 'test-repo',
  validUntil: new Date(Date.now() + 1000000).toISOString(),
  envFileName: 'environments.yaml',
};

const ActivatedRouteStub = {};
const DialogStub = {
  input: new BehaviorSubject(undefined),
  output: new BehaviorSubject(undefined)
};
const RouterStub = new BehaviorSubject(undefined);

export class TestContext<T> extends TestCtx<T> {

  readonly routerStub = RouterStub;
  readonly dialogStub = DialogStub;
  readonly activatedRouteStub = ActivatedRouteStub;
  readonly httpMock: HttpTestingController;
  readonly store: Store<any>;
  readonly observables: { [name: string]: BehaviorSubject<any>} = {};

  constructor(testCtx: TestCtx<T>) {
    super(testCtx.fixture);
    this.httpMock = TestBed.get(HttpTestingController);
    this.store = this.resolve(Store);
  }
}

class ValueOfObservable<T> extends BehaviorSubject<T> {
  subscription: Subscription;

  constructor(observable: Observable<T>) {
    super(undefined);
    this.subscription = observable.subscribe((_result) => {
      this.next(_result);
    });
  }

  unsubscribe() {
    this.subscription.unsubscribe();
  }
}

export const assertDialogOpened = <T>(dialogType: Type<T>, options) => {
  expect(DialogStub.input.value).toEqual({dialogType, options});
};

export const Setup = <T>(componentType: Type<T>, initActions?: Action[], noInit?: boolean) => {

  configureTestSuite(() => {
    TestBed.configureTestingModule({
      imports: [
        MaterialComponentsModule,
        HttpClientTestingModule,
        StoreModule.forRoot(reducers),
        EffectsModule.forRoot([AppEffects, AuthEffects, BackendEffects, DashboardEffects, EditorEffects])
      ],
      declarations: [
        InitializerDirective,
        componentType
      ],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: (paths) => {
              RouterStub.next(paths);
            }
          }
        },
        {
          provide: MatDialog, useValue: {
            open(dialogType, options) {
              DialogStub.input.next({dialogType, options});
              return {
                afterClosed: () => {
                  DialogStub.output = new BehaviorSubject(undefined);
                  return DialogStub.output;
                }
              };
            }
          },
        },
        {
          provide: MatDialogRef, useValue: {
            close: (value) => {
              DialogStub.output.next(value);
            }
          },
        },
        {
          provide: ActivatedRoute, useValue: ActivatedRouteStub,
        },
        {
          provide: MAT_DIALOG_DATA, useValue: {},
        },
      ],
      schemas: [ NO_ERRORS_SCHEMA ],
    });
  });

  let ctx: TestContext<T>;

  beforeEach(async () => {

    ctx = new TestContext(createTestContext(componentType));

    if (initActions) {
      initActions.forEach(action => ctx.store.dispatch(action));
    }

    // For best practice, the component's observables should be
    // created directly as component's instance properties
    // (instead of created during ngOnInit/ngOnChanges)
    _.keys(ctx.component).forEach(key => {
      const obs = ctx.component[key];
      if (isObservable(obs)) {
        ctx.observables[key] = new ValueOfObservable(obs);
      }
    });

    if (!noInit) {
      ctx.fixture.detectChanges(); // This will trigger lifecyle ngOnInit/ngOnChanges
    }

    await ctx.fixture.whenStable();
  });

  afterEach(() => {
    _.keys(ctx.observables).forEach(key => {
      ctx.observables[key].unsubscribe();
    });
  });

  return () => ctx;
};
