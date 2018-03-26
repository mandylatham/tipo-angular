(function() {

    'use strict';

    var SUBSCRIPTION_RESOURCE = 'tipo_app_info';
    var ACCOUNT_RESOURCE = 'TipoAccount/default';
    var PROFILE_RESOURCE = 'TipoUser/default';

    function MetadataService(
        tipoResource,
        tipoErrorHandler,
        $mdMedia,
        $q,
        $http,
        $rootScope,
        $templateCache,
        $location,
        $window) {

        var _instance = this;

        function checksum(string) {
            var hash = 0x12345678;
            var len = string.length;
            for (var i = 0; i < len; i++) {
                hash += (string.charCodeAt(i) * (i + 1));
            }
            return (hash & 0xffffffff).toString(16);
        }

        _instance.loadAppMetadata = function() {
            var origin = $window.location.href;
            var promise = tipoResource.one(SUBSCRIPTION_RESOURCE).get({
                type: 'application',
                url: origin
            });
            promise = promise.then(function(metadata) {
                _instance.applicationMetadata = metadata;
                $rootScope.version_stamp = metadata.SystemConfig.build_number + "." + metadata.TipoApp.app_version + "." + metadata.TipoApp.random;
                // console.log("$location.absUrl()");
                // console.log($location.absUrl());
                // console.log($location.protocol());
                // console.log($location.host());
                // console.log($location.port());
                // console.log($location.path());
                $rootScope.tipoapp_version = metadata['TipoTapp.TipoApp.Version'];
                console.log($window.location.pathname);
                var pathname = $window.location.pathname;
                // $rootScope.relative_path = pathname;
                // if (_.startsWith(pathname,"/app/d")) {
                //   $rootScope.cdn_host = metadata.SystemConfig.app_cdn_host;
                // }else{
                $rootScope.only_cdn_host = metadata.SystemConfig.app_cdn_host + "/";
                $rootScope.app_internal_host = metadata.SystemConfig.app_internal_host + "/";
                $rootScope.cdn_host = metadata.SystemConfig.app_cdn_host + "/app/d/" + metadata.TipoApp.application_owner_account_name + "/" + metadata.TipoApp.application_name + "/";
                // }
                return metadata;
            }, function() {
                console.warn('Could not fetch the application metadata. This indicates that the Tipo APIs are not reachable');
                var exception = {
                    headerCode: '500',
                    headerMessage: 'Application Unreachable',
                    detailCode: '500',
                    detailMessage: 'Could not fetch the application metadata. This indicates that the backend APIs are not reachable'
                };
                tipoErrorHandler.handleError(exception);
                return {};
            });
            return promise;
        };

        _instance.loadAccount = function() {
            var promise = tipoResource.one(ACCOUNT_RESOURCE).get();
            return promise.then(function(account) {
                _instance.account = account;
                return account;
            }, function() {
                console.warn('Could not fetch the account. This indicates that the Tipo APIs are not reachable');
                var exception = {
                    headerCode: '500',
                    headerMessage: 'Application Unreachable',
                    detailCode: '500',
                    detailMessage: 'Could not fetch the account. This indicates that the backend APIs are not reachable'
                };
                tipoErrorHandler.handleError(exception);
                return {};
            });
        };

        _instance.loadUserMetadata = function() {
            if (!_instance.userMetadata) {
                var promise = tipoResource.one(PROFILE_RESOURCE).get(undefined, { 'Cache-Control': 'max-age:0' });
                return promise.then(function(profile) {
                    _instance.userMetadata = profile;
                    _instance.cckey = checksum(profile.account + '.' + profile.role);
                    return profile;
                }, function(error) {
                    console.log("error");
                    console.log(error);
                    return {};
                });
            };
        };

        _instance.clearServerCache = function() {
            return tipoResource.one('TipoSpecial.Cache.Remove/default').doPUT({});
        };

        _instance.resolveAppCustomTemplates = function(template_name, alt_path) {
            var deferred = $q.defer();
            var template = _instance.resolveAppCustomUrls(template_name, alt_path);
            if (template !== alt_path) {
                var attach_version_stamp = "?version_stamp=" + $rootScope.version_stamp;
            } else {
                var attach_version_stamp = "";
            }
            if ($templateCache.get(template + attach_version_stamp)) {
                deferred.resolve($templateCache.get(template + attach_version_stamp));
            } else {
                $http.get(template).then(function(tpl) { $templateCache.put(template + attach_version_stamp, tpl.data);
                    $templateCache.put(template, tpl.data);
                    deferred.resolve(tpl.data); });
            }
            return deferred.promise;
        }

        _instance.resolveAppCustomUrls = function(template_name, alt_path) {
            if (!_instance.applicationMetadata.TipoCustomization) {
                _instance.applicationMetadata.TipoCustomization = {};
            };
            var templateObj = _instance.applicationMetadata.TipoCustomization[template_name] || {};
            if (templateObj.rootFolder && templateObj.key) {
                var template = 'g/' + templateObj.key;
            } else {
                var template = alt_path;
            }
            return template;
        }

        function loadGeolocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        _instance.geoLocation = position.coords;
                    });
            }
        }

        function loadDeviceInformation() {
            _instance.deviceInformation = $.ua.device;
            var isSmallScreen = $mdMedia('xs');
            _instance.deviceInformation.isMobile = isSmallScreen || _instance.deviceInformation.type === 'mobile';
        }

        loadGeolocation();
        loadDeviceInformation();
    }

    angular.module('tipo.common')
        .service('metadataService', MetadataService);

})();