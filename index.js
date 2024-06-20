import axios from 'axios';

class AnalyticsTracker {
  constructor(apiUrl, sessionTimeout = 30 * 60 * 1000) {
    this.gaTrackingId = null;
    this.activityStartTime = {};
    this.sessionStartTime = null;
    this.sessionTimeout = sessionTimeout;
    this.activeUsers = new Set();
    this.apiUrl = apiUrl;
    this.sessionId = null; // New property to store session ID
    this.previousPath = null
    this.entryUrl = null;
    this.exitUrl = null;

    // Bind methods to the instance
    this.initializeTracking = this.initializeTracking.bind(this);
    this.startSession = this.startSession.bind(this);
    this.startActivity = this.startActivity.bind(this);
    this.endActivity = this.endActivity.bind(this);
    this.addActiveUser = this.addActiveUser.bind(this);
    this.removeActiveUser = this.removeActiveUser.bind(this);
    this.updateActiveUserList = this.updateActiveUserList.bind(this);
    this.sendToApi = this.sendToApi.bind(this);
    this.trackPageView = this.trackPageView.bind(this);
    this.trackUserActivity = this.trackUserActivity.bind(this);
    this.resetSessionTimer = this.resetSessionTimer.bind(this);
    this.endSession = this.endSession.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleLeaveWebsite = this.handleLeaveWebsite.bind(this);
    this.sendToApiPageEngagement = this.sendToApiPageEngagement.bind(this)
    this.generateSessionId = this.generateSessionId.bind(this);
    this.getUserIdFromStorage = this.getUserIdFromStorage.bind(this);
    this.storeUserId = this.storeUserId.bind(this);
    this.generateUserId = this.generateUserId.bind(this);
    this.getUserLocation = this.getUserLocation.bind(this);
    this.getDeviceName = this.getDeviceName.bind(this);
    

    // Monitor user activity to reset session timer
    document.addEventListener('mousemove', this.resetSessionTimer);
    document.addEventListener('keydown', this.resetSessionTimer);

    // End session after a period of inactivity
    setInterval(() => {
      const currentTime = new Date();
      if (currentTime - this.sessionStartTime > this.sessionTimeout) {
        this.endSession();
        this.startSession();
      }
    }, this.sessionTimeout);

    // Track page changes to start and end activity timers
    window.addEventListener('popstate', () => {
      const userId = this.getUserIdFromStorage('auserid'); // Function to get userId from your app
      const id = this.getUserIdFromStorage('aid')
      const newPath = window.location.href;
      console.log(document.referrer, newPath, userId);
     // const previousPath = document.referrer !== window.location.href ? new URL(document.referrer).pathname : null;
      console.log(this.previousPath);
      this.endActivity(userId, this.previousPath,id);
      this.previousPath = newPath;
      this.startActivity(userId, newPath, id);
    });

   
  window.addEventListener('unload', (event) => {
    const userId = this.getUserIdFromStorage('auserid'); // Function to get userId from your app
    const id = this.getUserIdFromStorage('aid');
    const pagePath = window.location.href;
    const activityStart = this.activityStartTime[id]?.[pagePath];
    if (activityStart) {
      const activityEnd = new Date();
      const activityDuration = activityEnd - activityStart;
      const params = new URLSearchParams();
      params.set('userId', userId);
      params.set('pagePath', pagePath);
      params.set('duration', activityDuration);
      params.set('trackingId', this.gaTrackingId);
      params.set('session_id', this.sessionId);
      params.set('id', id);
      //this.sendToApiPageEngagement({ userId, pagePath, duration: activityDuration, trackingId:this.gaTrackingId , session_id:this.sessionId, id:id});
      navigator.sendBeacon("http://34.234.96.221:8089/cai/pathEngagement", params);
      delete this.activityStartTime[id][pagePath];
    }
      //this.handleLeaveWebsite(); // Call your function directly
      // Execute custom logic before the page is unloaded
  });

    
    this.initWebSocket();
    
  }

  initWebSocket() {
    const wsUrl = 'ws://34.234.96.221:8089/';
  
    try {
      this.ws = new WebSocket(wsUrl);
  
      this.ws.onopen = () => {
        console.log("WebSocket connection opened");
        // Perform actions on WebSocket connection open
      };
  
      this.ws.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        // Handle WebSocket messages
      };
  
      this.ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        // Reconnect WebSocket if needed
        // Example: this.initWebSocket();

       

      };
  
      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        // Handle WebSocket errors
      };
    } catch (error) {
      console.error("WebSocket initialization error:", error);
    }
  }

  sendWebSocketMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn("WebSocket connection is not open.");
    }
  }

  

  async initializeTracking(trackingId, options = {}) {
    this.gaTrackingId = trackingId;
    console.log(trackingId,options);
    this.user_id = options.user_id || this.getUserIdFromStorage() || this.generateUserId();
    this.id = this.getUserIdFromStorage('aid') || this.generateAnonymousId();
    this.storeUserId('auserid',this.user_id);
    this.storeUserId('aid',this.id);
    const api = 'http://34.234.96.221:8089/cai/init'
    this.startSession();
    const location = await this.getUserLocation();
    const deviceName = this.getDeviceName();
    axios.post(api,{trackingId:trackingId,user_id:this.user_id,id:this.id,location:location, deviceName:deviceName }).then((res)=>console.log('data sended'))
  }

  startSession() {
    this.sessionId = this.generateSessionId(); // Generate a unique session ID
    this.sessionStartTime = new Date();
    const userId = this.getUserIdFromStorage('auserid'); // Function to get userId from your app
    const id = this.getUserIdFromStorage('aid')
    const pagePath = window.location.href;
    this.entryUrl = pagePath;
    console.log(pagePath);
    this.previousPath= pagePath;
    this.startActivity(userId, pagePath, id);
    this.addActiveUser(userId, id);
  }

  startActivity(userId, pagePath, id) {
    if (!this.activityStartTime[id]) {
      this.activityStartTime[id] = {};
    }
    this.activityStartTime[id][pagePath] = new Date();
  }

  endActivity(userId, pagePath, id) {
    const activityStart = this.activityStartTime[id]?.[pagePath];
    if (activityStart) {
      const activityEnd = new Date();
      const activityDuration = activityEnd - activityStart;
     this.gaTrackingId && this.sendToApiPageEngagement({ userId, pagePath, duration: activityDuration, trackingId:this.gaTrackingId , session_id:this.sessionId, id:id});
      delete this.activityStartTime[id][pagePath];
    }
  }

  getUserLocation() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            resolve(location); // Resolve with location data
          },
          (error) => {
            console.error('Error getting location:', error.message);
            reject(error); // Reject with error
          }
        );
      } else {
        console.error('Geolocation is not supported by this browser.');
        reject(new Error('Geolocation is not supported')); // Reject with error
      }
    });
  }
  

  getDeviceName() {
    return navigator.userAgent; // Returns user agent string (including device info)
  }

  async addActiveUser(userId, id) {
    this.activeUsers.add(id);
    const location = await this.getUserLocation();
    const deviceName = this.getDeviceName();
    this.updateActiveUserList(location,deviceName);
  }

  removeActiveUser(userId, id) {
    this.activeUsers.delete(id);
    this.updateActiveUserList();
  }

  updateActiveUserList(location,deviceName) {
    const activeUserList = Array.from(this.activeUsers);
    // Update active user list on the website UI
  //   const api = 'http://34.234.96.221:8089/cai/activeList'
  //   axios.post(api,{activeUserList:activeUserList, trackingId:this.gaTrackingId, location:location, deviceName:deviceName, id:this.getUserIdFromStorage('aid'), user_id:this.getUserIdFromStorage('auserid')}).then((res)=>console.log("Active User List Updated")).catch((err)=>console.log('Error while sending data to api',err))
  }

  sendToApiPageEngagement(data) {
    const api = 'http://34.234.96.221:8089/cai/pathEngagement'
    axios.post(api, data)
      .then(response => {
        console.log('Data sent successfully:', response.data);
      })
      .catch(error => {
        console.error('Error sending data to API:', error);
      });
  }

  sendToApi(data) {
    const api = 'http://34.234.96.221:8089/cai/session'
    axios.post(api, data)
      .then(response => {
        console.log('Data sent successfully:', response.data);
      })
      .catch(error => {
        console.error('Error sending data to API:', error);
      });
  }

  trackPageView(path) {
    if (!this.gaTrackingId) {
      console.error('Tracking is not initialized.');
      return;
    }
    // Track page view with path
  }

  trackUserActivity(eventName, eventData) {
    if (!this.gaTrackingId) {
      console.error('Tracking is not initialized.');
      return;
    }
    const userId = this.getUserIdFromStorage('auserid'); // Function to get userId from your app
    const id = this.getUserIdFromStorage('aid')
    this.resetSessionTimer();
    this.addActiveUser(userId, id);
  }

  resetSessionTimer() {
    this.sessionStartTime = new Date();
  }

  endSession() {
    const endTime = new Date();
    const sessionDuration = endTime - this.sessionStartTime;
    const pagePath = window.location.href;
    this.exitUrl = pagePath;
    // Track session duration
    
    // Example: this.sendToApi({ userId: this.getUserIdFromStorage(), sessionDuration });
    this.sendToApi({ userId: this.getUserIdFromStorage('auserid'), sessionDuration:sessionDuration, trackingId:this.gaTrackingId , id:this.getUserIdFromStorage('aid'), entryUrl:this.entryUrl, exitUrl:this.exitUrl, session_id:this.sessionId})
  }

  handleLogout() {
    const userId = this.getUserIdFromStorage('auserid'); // Function to get userId from your app
    const id = this.getUserIdFromStorage('aid');
    this.removeActiveUser(userId, id);
    this.endSession()
  }

  async handleLeaveWebsite() {
    console.log('website leaved');
    const userId = this.getUserIdFromStorage('auserid'); // Function to get userId from your app
    const id = this.getUserIdFromStorage('aid');
    this.removeActiveUser(userId, id);
    this.endActivity(userId, window.location.href, id); // End the current activity
    this.endSession()
  }

  getUserIdFromApp() {
    // Implement logic to get user ID from your app
  }

  getUserIdFromStorage(key) {
    return sessionStorage.getItem(key); // Assuming you store user ID in sessionStorage
  }
  getUserIdFromLocalStorage(key) {
    return localStorage.getItem(key); // Retrieve user ID from local storage
  }

  storeUserIdLocalStorage(key, value) {
    localStorage.setItem(key, value); // Store user ID in local storage
  }

  storeUserId(key,value) {
    sessionStorage.setItem(key, value); // Store user ID in sessionStorage
  }

  generateUserId() {
    return Math.random().toString(36).substr(2, 9); // Generate a random user ID
  }
  generateAnonymousId() {
    const anonymousId = Math.random().toString(36).substr(2, 9); // Generate a random anonymous user ID
    return anonymousId;
  }
  generateSessionId() {
    return Math.random().toString(36).substr(2, 9); // Generate a random session ID
  }
}

const analyticsTrackerInstance = new AnalyticsTracker('your_api_url_here');

export default analyticsTrackerInstance;

//module.exports = analyticsTrackerInstance;

//module.exports = AnalyticsTracker;
