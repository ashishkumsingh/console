// The main app module.
angular.module('bridge', [
  // angular deps
  'ngRoute',
  'ngAnimate',
  'ngSanitize',
  'ngCookies',
  // other deps
  'ui.bootstrap',
  'underscore',
  'jquery',
  'coreos',
  'ngTagsInput',
  // internal modules
  'templates',
  'dex',
  'k8s',
  'bridge.const',
  'bridge.filter',
  'bridge.service',
  'bridge.ui',
  'bridge.page',
  'core.pkg',
])
.config(function($compileProvider, $routeProvider, $locationProvider, $httpProvider,
                 configSvcProvider, errorMessageSvcProvider, flagSvcProvider, k8sConfigProvider) {
  'use strict';

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
  $locationProvider.html5Mode(true);
  flagSvcProvider.setGlobalId('SERVER_FLAGS');
  k8sConfigProvider.setKubernetesPath('/api/kubernetes/', window.SERVER_FLAGS.k8sVersion);
  $httpProvider.interceptors.push('unauthorizedInterceptorSvc');

  configSvcProvider.config({
    siteBasePath: '/',
    libPath: '/static/lib/coreos-web',
    jsonParse: true,
    detectHost: true,
    detectScheme: true,
  });

  errorMessageSvcProvider.registerFormatter('k8sApi', function(resp) {
    if (resp.data && resp.data.message) {
      return resp.data.message;
    }
    return 'An error occurred. Please try again.';
  });

  errorMessageSvcProvider.registerFormatter('dexApi', function(resp) {
    if (resp.data && resp.data.error_description) {
      return resp.data.error_description;
    }
    return 'An error occurred. Please try again.';
  });

  function r(route, config, unprotected) {
    if (!unprotected) {
      if (!config.resolve) {
        config.resolve = {};
      }
      config.resolve.ensureLoggedIn = 'ensureLoggedInSvc';
    }
    $routeProvider.when(route, config);
  }

  r('/', {
    controller: 'ClusterStatusCtrl',
    templateUrl: '/static/page/cluster/status.html',
    title: 'Cluster Status',
  });
  r('/apps', {
    controller: 'AppsCtrl',
    templateUrl: '/static/page/apps/apps.html',
    title: 'Applications',
    isNamespaced: true,
  });
  r('/all-namespaces/apps', {
    controller: 'AppsCtrl',
    templateUrl: '/static/page/apps/apps.html',
    title: 'Applications',
  });
  r('/ns/:ns/apps', {
    controller: 'AppsCtrl',
    templateUrl: '/static/page/apps/apps.html',
    title: 'Applications',
  });
  r('/ns/:ns/apps/new', {
    controller: 'NewAppCtrl',
    templateUrl: '/static/page/apps/new-app.html',
    title: 'Create New Application',
  });
  r('/events', {
    controller: 'EventsCtrl',
    templateUrl: '/static/page/events/events.html',
    title: 'Events',
    isNamespaced: true,
  });
  r('/all-namespaces/events', {
    controller: 'EventsCtrl',
    templateUrl: '/static/page/events/events.html',
    title: 'Events',
  });
  r('/ns/:ns/events', {
    controller: 'EventsCtrl',
    templateUrl: '/static/page/events/events.html',
    title: 'Events',
  });
  r('/services', {
    controller: 'ServicesCtrl',
    templateUrl: '/static/page/services/services.html',
    title: 'Services',
    isNamespaced: true,
  });
  r('/all-namespaces/services', {
    controller: 'ServicesCtrl',
    templateUrl: '/static/page/services/services.html',
    title: 'Services',
  });
  r('/ns/:ns/services', {
    controller: 'ServicesCtrl',
    templateUrl: '/static/page/services/services.html',
    title: 'Services',
  });
  r('/ns/:ns/services/new', {
    controller: 'NewServiceCtrl',
    templateUrl: '/static/page/services/new-service.html',
    title: 'Create New Service',
  });
  r('/ns/:ns/services/:name', {
    controller: 'ServiceCtrl',
    templateUrl: '/static/page/services/service.html',
    title: 'Service',
  });
  r('/ns/:ns/services/:name/pods', {
    controller: 'ServicePodsCtrl',
    templateUrl: '/static/page/services/pods.html',
    title: 'Service Pods',
  });
  r('/replicationcontrollers', {
    controller: 'ReplicationcontrollersCtrl',
    templateUrl: '/static/page/replicationcontrollers/replicationcontrollers.html',
    title: 'Replication Controllers',
    isNamespaced: true,
  });
  r('/all-namespaces/replicationcontrollers', {
    controller: 'ReplicationcontrollersCtrl',
    templateUrl: '/static/page/replicationcontrollers/replicationcontrollers.html',
    title: 'Replication Controllers',
  });
  r('/ns/:ns/replicationcontrollers', {
    controller: 'ReplicationcontrollersCtrl',
    templateUrl: '/static/page/replicationcontrollers/replicationcontrollers.html',
    title: 'Replication Controllers',
  });
  r('/ns/:ns/replicationcontrollers/new', {
    controller: 'NewReplicationcontrollerCtrl',
    templateUrl: '/static/page/replicationcontrollers/new-replicationcontroller.html',
    title: 'New Replication Controller',
  });
  r('/ns/:ns/replicationcontrollers/:name/edit', {
    controller: 'EditReplicationcontrollerCtrl',
    templateUrl: '/static/page/replicationcontrollers/edit-replicationcontroller.html',
    title: 'Edit Replication Controller',
  });
  r('/ns/:ns/replicationcontrollers/:name', {
    controller: 'ReplicationcontrollerCtrl',
    templateUrl: '/static/page/replicationcontrollers/replicationcontroller.html',
    title: 'Replication Controller',
  });
  r('/ns/:ns/replicationcontrollers/:name/pods', {
    controller: 'ReplicationcontrollerPodsCtrl',
    templateUrl: '/static/page/replicationcontrollers/pods.html',
    title: 'Replication Controller Pods',
  });
  r('/pods', {
    controller: 'PodsCtrl',
    templateUrl: '/static/page/pods/pods.html',
    title: 'Pods',
    isNamespaced: true,
  });
  r('/all-namespaces/pods', {
    controller: 'PodsCtrl',
    templateUrl: '/static/page/pods/pods.html',
    title: 'Pods',
  });
  r('/ns/:ns/pods', {
    controller: 'PodsCtrl',
    templateUrl: '/static/page/pods/pods.html',
    title: 'Pods',
  });
  r('/ns/:ns/pods/new', {
    controller: 'NewPodCtrl',
    templateUrl: '/static/page/pods/new-pod.html',
    title: 'Create New Pod',
  });
  r('/ns/:ns/pods/:name', {
    controller: 'PodCtrl',
    templateUrl: '/static/page/pods/pod.html',
    title: 'Pod',
  });
  r('/ns/:ns/pods/:name/events', {
    controller: 'PodSyseventsCtrl',
    templateUrl: '/static/page/pods/sysevents.html',
    title: 'Pod Events',
  });
  r('/ns/:ns/pods/:podName/containers/:name', {
    controller: 'ContainerCtrl',
    templateUrl: '/static/page/containers/container.html',
    title: 'Container',
  });
  r('/nodes', {
    controller: 'NodesCtrl',
    templateUrl: '/static/page/nodes/nodes.html',
    title: 'Nodes',
  });
  r('/nodes/:name', {
    controller: 'nodeCtrl',
    templateUrl: '/static/page/nodes/node.html',
    title: 'Node',
  });
  r('/nodes/:name/events', {
    controller: 'nodeSyseventsCtrl',
    templateUrl: '/static/page/nodes/sysevents.html',
    title: 'Node Events',
  });
  r('/nodes/:name/pods', {
    controller: 'nodePodsCtrl',
    templateUrl: '/static/page/nodes/pods.html',
    title: 'Node Pods',
  });
  r('/search', {
    controller: 'SearchCtrl',
    templateUrl: '/static/page/search/search.html',
    title: 'Search',
  });
  r('/settings/registries', {
    controller: 'RegistriesCtrl',
    templateUrl: '/static/page/settings/registries.html',
    title: 'Configure Registries',
  });
  r('/settings/users', {
    controller: 'UsersCtrl',
    templateUrl: '/static/page/settings/users.html',
    title: 'Manage Users',
  });
  r('/welcome', {
    controller: 'WelcomeCtrl',
    templateUrl: '/static/page/welcome/welcome.html',
    title: 'Welcome to your CoreOS Cluster',
  });
  r('/error', {
    controller: 'ErrorCtrl',
    templateUrl: '/static/page/error/error.html',
    title: 'Error',
  }, true);

  $routeProvider.otherwise({
    templateUrl: '/static/page/error/404.html',
    title: 'Page Not Found (404)'
  });
})
.run(function(_, $rootScope, $location, $window, CONST, flagSvc, debugSvc, firehose, namespacesSvc, authSvc) {
  'use strict';
  // Convenience access for temmplates
  $rootScope.CONST = CONST;
  $rootScope.SERVER_FLAGS = flagSvc.all();
  $rootScope.debug = debugSvc;
  firehose.start();

  $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
    switch(rejection) {
      case 'not-logged-in':
        $window.location.href = '/auth/login';
        break;
    }
  });

  // Completely destroys Angular and reload page if in angular redirect loop.
  // NOTE: this is a big stupid hack to get around an Angular bug wich is triggered by a Chrome bug.
  // see: https://github.com/coreos-inc/bridge/issues/270
  $rootScope.$on('$locationChangeStart', function(e, currURL) {
    if (currURL === $window.location.origin + '/#') {
      e.preventDefault();
      $rootScope.$destroy();
      $rootScope.$$watchers = [];
      $rootScope.$$postDigestQueue = [];
      $rootScope.$$asyncQueue = [];
      $rootScope.$$listeners = null;
      $window.location.href = '/';
    }
  });

  $rootScope.$on('xhr-error-unauthorized', function(e, rejection) {
    if (rejection.config && rejection.config.unauthorizedOk) {
      return;
    }

    authSvc.logout($window.location.pathname);
  });

  $rootScope.$on('$routeChangeStart', function(e, next) {
    if (_.isUndefined(next)) {
      return;
    }

    var nextPath = next.originalPath,
        isNamespaced = next.isNamespaced,
        namespacedRoute;

    if (isNamespaced) {
      // Cancel the route change.
      e.preventDefault();

      // Fix 'back' button behavior.
      //
      // This method (https://docs.angularjs.org/api/ng/service/$location#replace) will
      // replace the current entry in the history stack. This allows us to preserve the
      // correct functionality of the back button when doing these redirects.
      $location.replace();

      namespacedRoute = namespacesSvc.formatNamespaceRoute(nextPath);

      // Re-route to namespaced route.
      $location.path(namespacedRoute);
    }
  });

});
