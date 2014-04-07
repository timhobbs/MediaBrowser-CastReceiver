function guid() {
  function _p8(s) {
    var p = (Math.random().toString(16)+"000000000").substr(2,8);
    return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
  }
  return _p8() + _p8(true) + _p8(true) + _p8();
}

var module = angular.module('mediaBrowser', []);

module.config(function ($httpProvider) {
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});
//Setup
module.run(function ($rootScope) {
  window.mediaElement = document.getElementById('video-player');
  window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);
  $rootScope.versionNumber = '1.0.700';
  $rootScope.guid = guid();
});

module.filter('displayTime', function () {
  return function (ticks) {
    var ticksPerHour = 36000000000;

    var parts = [];

    var hours = ticks / ticksPerHour;
    hours = Math.floor(hours);

    if (hours) {
      parts.push(hours);
    }

    ticks -= (hours * ticksPerHour);

    var ticksPerMinute = 600000000;

    var minutes = ticks / ticksPerMinute;
    minutes = Math.floor(minutes);

    ticks -= (minutes * ticksPerMinute);

    if (minutes < 10 && hours) {
      minutes = '0' + minutes;
    }
    parts.push(minutes);

    var ticksPerSecond = 10000000;

    var seconds = ticks / ticksPerSecond;
    seconds = Math.round(seconds);

    if (seconds < 10) {
      seconds = '0' + seconds;
    }
    parts.push(seconds);

    return parts.join(':');
  };
});

module.factory('mediaBrowserActions', function ($timeout, $http, $q) {
  var factory = {};
  var controlsPromise, delayStartPromise, closeAppPromise;

  /**
   * @return {string}
   */
  function SHA1(msg) {

    function rotate_left(n, s) {
      return (n << s) | (n >>> (32 - s));
    }

    function cvt_hex(val) {
      var str = "";
      var i;
      var v;

      for (i = 7; i >= 0; i--) {
        v = (val >>> (i * 4)) & 0x0f;
        str += v.toString(16);
      }
      return str;
    }

    /**
     * @return {string}
     */
    function Utf8Encode(string) {
      string = string.replace(/\r\n/g, "\n");
      var utf_text = "";

      for (var n = 0; n < string.length; n++) {

        var c = string.charCodeAt(n);

        if (c < 128) {
          utf_text += String.fromCharCode(c);
        }
        else if ((c > 127) && (c < 2048)) {
          utf_text += String.fromCharCode((c >> 6) | 192);
          utf_text += String.fromCharCode((c & 63) | 128);
        }
        else {
          utf_text += String.fromCharCode((c >> 12) | 224);
          utf_text += String.fromCharCode(((c >> 6) & 63) | 128);
          utf_text += String.fromCharCode((c & 63) | 128);
        }

      }

      return utf_text;
    }

    var block_start;
    var i, j;
    var W = new Array(80);
    var H0 = 0x67452301;
    var H1 = 0xEFCDAB89;
    var H2 = 0x98BADCFE;
    var H3 = 0x10325476;
    var H4 = 0xC3D2E1F0;
    var A, B, C, D, E;
    var temp;

    msg = Utf8Encode(msg);

    var msg_len = msg.length;

    var word_array = [];
    for (i = 0; i < msg_len - 3; i += 4) {
      j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
        msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
      word_array.push(j);
    }

    switch (msg_len % 4) {
      case 0:
        i = 0x080000000;
        break;
      case 1:
        i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
        break;

      case 2:
        i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
        break;

      case 3:
        i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
        break;
    }

    word_array.push(i);

    while ((word_array.length % 16) != 14) word_array.push(0);

    word_array.push(msg_len >>> 29);
    word_array.push((msg_len << 3) & 0x0ffffffff);


    for (block_start = 0; block_start < word_array.length; block_start += 16) {

      for (i = 0; i < 16; i++) W[i] = word_array[block_start + i];
      for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

      A = H0;
      B = H1;
      C = H2;
      D = H3;
      E = H4;

      for (i = 0; i <= 19; i++) {
        temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      for (i = 20; i <= 39; i++) {
        temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      for (i = 40; i <= 59; i++) {
        temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      for (i = 60; i <= 79; i++) {
        temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      H0 = (H0 + A) & 0x0ffffffff;
      H1 = (H1 + B) & 0x0ffffffff;
      H2 = (H2 + C) & 0x0ffffffff;
      H3 = (H3 + D) & 0x0ffffffff;
      H4 = (H4 + E) & 0x0ffffffff;

    }

    temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

    temp = temp.toLowerCase();
    return temp;
  }

  var setControls = function ($scope) {
    $timeout.cancel(controlsPromise);
    controlsPromise = $timeout(function () {
      if ($scope.status == 'playing-with-controls') {
        $scope.status = 'playing';
      }
    }, 8000);
  };
  var setApplicationClose = function () {
    $timeout.cancel(closeAppPromise);
    closeAppPromise = $timeout(function () {
      window.close();
    }, 300000, false);
  };
  var clearTimeouts = function () {
    $timeout.cancel(controlsPromise);
    $timeout.cancel(closeAppPromise);
    $timeout.cancel(delayStartPromise);
  };

  var fallBackBackdropImg = function ($scope, src) {
    var setBackdrop = function () {
      $scope.backdrop = this.src;
      $scope.$apply();
    };
    var loadElement = document.createElement('img');
    loadElement.src = src;
    loadElement.addEventListener('error', function () {
      loadElement.removeEventListener('load', setBackdrop);
    });

    loadElement.addEventListener('load', setBackdrop);
    $timeout(function () {
      loadElement.removeEventListener('load', setBackdrop);
    }, 30000);
  };

  var authorizationHeader = function ($scope, currentUserId) {
    var auth = 'MediaBrowser Client="Chromecast", Device="' + $scope.deviceName + '", DeviceId="' + $scope.deviceId + '", Version="' + $scope.versionNumber + '"';

    if (currentUserId) {
      auth += ', UserId="' + currentUserId + '"';
    }

    return auth;
  };

  var getUrl = function ($scope, name) {

    if (!name) {
      throw new Error("Url name cannot be empty");
    }

    var url = $scope.serverAddress;

    url += "/mediabrowser/" + name;

    return url;
  };

  factory.reportPlaybackStart = function ($scope, userId, itemId, canSeek, queueableMediaTypes) {

    var deferred = $q.defer();
    deferred.resolve();
      
    if (!userId) {
      console.log("null userId");
      return deferred.promise;
    }

    if (!itemId) {
      console.log("null itemId");
      return deferred.promise;
    }

    if (!$scope.serverAddress) {
      console.log("null serverAddress");
      return deferred.promise;
    }
    var params = {
      CanSeek: canSeek,
      QueueableMediaTypes: queueableMediaTypes
    };

    var url = getUrl($scope, "Users/" + userId + "/PlayingItems/" + itemId);
    var auth = authorizationHeader($scope, userId);
    return $http.post(url, params,
      {
        params: params,
        headers: {
          Authorization: auth
        }
      });
  };

  factory.reportPlaybackProgress = function ($scope, userId, itemId, positionTicks, isPaused, isMuted) {

    var deferred = $q.defer();
    deferred.resolve();
      
    if (!userId) {
      console.log("null userId");
      return deferred.promise;
    }

    if (!itemId) {
      console.log("null itemId");
      return deferred.promise;
    }

    if (!$scope.serverAddress) {
      console.log("null serverAddress");
      return deferred.promise;
    }

    var params = {
      isPaused: isPaused,
      isMuted: isMuted
    };

    if (positionTicks) {
      params.positionTicks = Math.round(positionTicks);
    }

    var url = getUrl($scope, "Users/" + userId + "/PlayingItems/" + itemId + "/Progress");
    var auth = authorizationHeader($scope, userId);
    return $http.post(url, params,
      {
        params: params,
        headers: {
          Authorization: auth
        }
      });
  };

  factory.reportPlaybackStopped = function ($scope, userId, itemId, positionTicks) {

    var deferred = $q.defer();
    deferred.resolve();
      
    if (!userId) {
      console.log("null userId");
      return deferred.promise;
    }

    if (!itemId) {
      console.log("null itemId");
      return deferred.promise;
    }

    if (!$scope.serverAddress) {
      console.log("null serverAddress");
      return deferred.promise;
    }

    var params = {};

    if (positionTicks) {
      params.positionTicks = positionTicks;
    }

    var url = getUrl($scope, "Users/" + userId + "/PlayingItems/" + itemId);
    var auth = authorizationHeader($scope, userId);
    return $http.delete(url,
      {
        params: params,
        headers: {
          Authorization: auth
        }
      });
  };

  factory.load = function ($scope, customData) {
    $scope.$apply(function () {
      $scope.poster = '';
      $scope.backdrop = '';
      $scope.mediaTitle = '';
      $scope.secondaryTitle = '';
      $scope.duration = 0;
      $scope.currentTime = 0;
      $scope.mediaType = '';
      $scope.serverAddress = '';
      $scope.userId = '';
      $scope.itemId = '';
      $scope.deviceName = '';
      $scope.deviceId = '';
    });
    clearTimeouts();
    var contentInfo = customData || {};
    if(typeof (contentInfo.serverAddress) === 'undefined' || contentInfo.serverAddress == '' ||
      typeof (contentInfo.userId) === 'undefined' || contentInfo.userId == '' ||
      typeof (contentInfo.itemId) === 'undefined' || contentInfo.itemId == '') {
      var deferred = $q.defer();
      deferred.resolve();
      return deferred.promise;
    }
    if (contentInfo.serverAddress.indexOf('http://') < 0 )
      contentInfo.serverAddress = 'http://' + contentInfo.serverAddress;
    $scope.startTimeTicks = contentInfo.startTimeTicks || 0;
	$scope.startTimeTicks = $scope.startTimeTicks * 1;
    $scope.serverAddress = contentInfo.serverAddress;
    $scope.userId = contentInfo.userId;
    $scope.itemId = contentInfo.itemId;
    $scope.deviceName = contentInfo.deviceName || 'Chromecast';
    $scope.deviceId = contentInfo.deviceId || SHA1($scope.guid);
    var requestUrl = getUrl($scope, 'Users/' + $scope.userId + '/Items/' + $scope.itemId);
    return $http.get(requestUrl).success(function (data) {
      $scope.duration = data.RunTimeTicks;
      var isSeries = !!data.SeriesName;
      var backdropUrl = '';
      if (data.BackdropImageTags && data.BackdropImageTags.length) {
        backdropUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.Id + '/Images/Backdrop/0?tag=' + data.BackdropImageTags[0];
      }
      else {
        if (data.ParentBackdropItemId && data.ParentBackdropImageTags && data.ParentBackdropImageTags.length) {
          backdropUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.ParentBackdropItemId + '/Images/Backdrop/0?tag=' + data.ParentBackdropImageTags[0];
        }
      }
      var posterUrl = '';
      if (isSeries) {
        posterUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.SeriesId + '/Images/Primary?tag=' + data.SeriesPrimaryImageTag;
      } else {
        posterUrl = $scope.serverAddress + '/mediabrowser/Items/' + data.Id + '/Images/Primary?tag=' + (data.PrimaryImageTag || data.ImageTags.Primary);
      }
      $scope.poster = posterUrl;
      fallBackBackdropImg($scope, backdropUrl);
      $scope.mediaTitle = isSeries ? data.SeriesName : data.Name;
      $scope.secondaryTitle = isSeries ? data.Name : '';
      $scope.status = 'backdrop';
      $scope.mediaType = data.MediaType;
    }).then(function () {
        clearTimeouts();
      });
  };

  factory.delayStart = function ($scope) {
    delayStartPromise = $timeout(function () {

      factory.reportPlaybackStart($scope, $scope.userId, $scope.itemId, false, $scope.mediaType).finally(function () {
        window.mediaElement.play();
        $scope.status = 'playing-with-controls';
        $scope.paused = false;
      });
    }, 3500).then(function () {
        setControls($scope);
      });
  };

  factory.play = function ($scope, event) {
    $scope.$apply(function () {
      $scope.paused = false;
    });
    if ($scope.status == 'backdrop' || $scope.status == 'playing-with-controls' || $scope.status == 'playing') {
      clearTimeouts();
      $timeout(function () {
        var startTime = new Date();
        window.mediaElement.play();
        window.mediaElement.pause();
        while (typeof(window.mediaElement.buffered) === 'undefined' || window.mediaElement.buffered.length === 0) {
          if ((new Date()) - startTime > 25000) {
            $scope.status = 'waiting';
            factory.setApplicationClose();
            return;
          }
        }
        window.mediaManager.defaultOnPlay(event);
        $scope.status = 'playing-with-controls';
      }, 20).then(function () {
          setControls($scope);
        });
    }
  };

  factory.pause = function ($scope) {
    $scope.$apply(function () {
      $scope.status = 'playing-with-controls';
      $scope.paused = true;
      $scope.currentTime = window.mediaElement.currentTime;
      clearTimeouts();
    });
  };

  factory.stop = function ($scope) {
    $scope.$apply(function () {
      clearTimeouts();
      $scope.status = 'waiting';
      setApplicationClose();
    });
  };
  factory.setApplicationClose = setApplicationClose;
  return factory;
});

//Controllers
module.controller('MainCtrl', function ($scope, mediaBrowserActions) {
    var init = function () {
      $scope.startTimeTicks = 0;
      $scope.status = 'waiting';
      $scope.currentTime = 0;
      $scope.duration = 0;
      $scope.poster = '';
      $scope.backdrop = '';
      $scope.mediaTitle = '';
      $scope.secondaryTitle = '';
      $scope.duration = 0;
      $scope.currentTime = 0;
      $scope.mediaType = '';
      $scope.serverAddress = '';
      $scope.userId = '';
      $scope.itemId = '';
      $scope.deviceName = '';
      $scope.deviceId = '';
      document.getElementById('video-player').src = "";
    };
    init();
    mediaBrowserActions.setApplicationClose();
    window.mediaManager.onEnded = function () {
      mediaBrowserActions.setApplicationClose();
      mediaBrowserActions.reportPlaybackStopped($scope, $scope.userId, $scope.itemId);
      $scope.$apply(init);
    };
    var broadcastToServer = new Date();
    var updatePosition = new Date();
    window.mediaElement.addEventListener('timeupdate', function () {
      if (typeof ($scope.serverAddress) !== 'undefined' && $scope.serverAddress != '' && (new Date()) - broadcastToServer > 5000) {
        mediaBrowserActions.reportPlaybackProgress($scope, $scope.userId, $scope.itemId, window.mediaElement.currentTime * 10000000, window.mediaElement.paused, window.mediaElement.volume == 0);
        broadcastToServer = new Date();
      }
      if ( (new Date()) - broadcastToServer > 1000) {
        if(window.castReceiverManager.getSenders().length > 0){
          window.mediaManager.broadcastStatus(false);
        }
        $scope.$apply(function () {
          $scope.currentTime = window.mediaElement.currentTime;
        });
      }
    });
    window.mediaManager.defaultOnLoad = window.mediaManager.onLoad;
    window.mediaManager.onLoad = function (event) {
      if (window.player !== null) {
        player.unload();    // Must unload before starting again.
        window.player = null;
      }
      if (event.data.media && event.data.media.contentId) {
        $scope.$apply(function () {
          $scope.status = 'loading';
        });
        mediaBrowserActions.load($scope, event.data.media.customData).then(function () {
          console.log('Starting media application');
          var url = event.data.media.contentId;
// Create the Host - much of your interaction with the library uses the Host and
// methods you provide to it.
          window.host = new cast.player.api.Host(
            {'mediaElement': window.mediaElement, 'url': url});
          var ext = url.substring(url.lastIndexOf('.'), url.length);
          ext = ext.substring(0, ext.lastIndexOf('?'));
          var initStart = event.data.media.currentTime || 0;
          var autoPlay = event.data.autoplay || true;
          var protocol = null;
          window.mediaElement.autoplay = autoPlay;  // Make sure autoPlay gets set
          if (url.lastIndexOf('.m3u8') >= 0) {
// HTTP Live Streaming
            protocol = cast.player.api.CreateHlsStreamingProtocol(host);
          } else if (url.lastIndexOf('.mpd') >= 0) {
// MPEG-DASH
            protocol = cast.player.api.CreateDashStreamingProtocol(host);
          } else if (url.indexOf('.ism/') >= 0) {
// Smooth Streaming
            protocol = cast.player.api.CreateSmoothStreamingProtocol(host);
          }
          host.onError = function (errorCode) {
            console.log("Fatal Error - " + errorCode);
            window.player.unload();
          };
          console.log("we have protocol " + ext);
          if (protocol !== null) {
            console.log("Starting Media Player Library");
            window.player = new cast.player.api.Player(host);
            window.player.load(protocol, initStart);
            if (autoPlay) {
              window.mediaElement.pause();
              mediaBrowserActions.delayStart($scope);
            }
          }
          else {
            window.mediaManager.defaultOnLoad(event);    // do the default process
            if (autoPlay) {
              window.mediaElement.pause();
              mediaBrowserActions.delayStart($scope);
            }
          }
        });
      }
    };

    window.mediaManager.defaultOnPlay = window.mediaManager.onPlay;
    window.mediaManager.onPlay = function (event) {
      mediaBrowserActions.play($scope, event);
      mediaBrowserActions.reportPlaybackStart($scope, $scope.userId, $scope.itemId, false, $scope.mediaType);
    };

    window.mediaManager.defaultOnPause = window.mediaManager.onPause;
    window.mediaManager.onPause = function (event) {
      window.mediaManager.defaultOnPause(event);
      mediaBrowserActions.pause($scope);
      mediaBrowserActions.reportPlaybackProgress($scope, $scope.userId, $scope.itemId, window.mediaElement.currentTime * 10000000, window.mediaElement.paused, window.mediaElement.volume == 0);
    };

    window.mediaManager.defaultOnStop = window.mediaManager.onStop;
    window.mediaManager.onStop = function (event) {
      window.mediaManager.defaultOnStop(event);
      mediaBrowserActions.stop($scope);
      mediaBrowserActions.reportPlaybackStopped($scope, $scope.userId, $scope.itemId);
    };

    window.player = null;
    console.log('Application is ready, starting system');
    window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
    window.castReceiverManager.start();
  }
);