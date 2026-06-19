const { app } = require('electron');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const Tracker = {
  dataFile: path.join(app.getPath('userData'), 'tracker.json'),
  deviceId: null,

  getDeviceId() {
    if (this.deviceId) return this.deviceId;
    const platform = process.platform;
    const hostname = require('os').hostname();
    const user = require('os').userInfo().username;
    let raw = `${platform}-${hostname}-${user}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const chr = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    this.deviceId = 'dev_' + Math.abs(hash).toString(36);
    return this.deviceId;
  },

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      }
    } catch (e) {}
    return { firstLaunch: null, launches: 0 };
  },

  saveData(data) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
  },

  sendEvent(eventType, extra = {}) {
    const dbURL = typeof TRACKING_CONFIG !== 'undefined' ? TRACKING_CONFIG.databaseURL : '';
    if (!dbURL || dbURL.includes('your-project-id')) return;

    const data = this.loadData();
    const now = new Date().toISOString();
    const isFirstLaunch = data.firstLaunch === null;

    if (isFirstLaunch) data.firstLaunch = now;
    data.launches++;
    this.saveData(data);

    const payload = {
      deviceId: this.getDeviceId(),
      event: eventType,
      timestamp: now,
      platform: process.platform,
      arch: process.arch,
      appVersion: app.getVersion(),
      isFirstInstall: isFirstLaunch,
      totalLaunches: data.launches,
      ...extra
    };

    const url = new URL(dbURL);
    const pathStr = `/events/${eventType}/${this.getDeviceId()}_${Date.now()}.json`;
    const transport = url.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: pathStr,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = transport.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {});
    });

    req.on('error', () => {});
    req.write(JSON.stringify(payload));
    req.end();
  },

  trackInstall() {
    this.sendEvent('install');
  },

  trackLaunch() {
    this.sendEvent('launch');
  },

  trackEvent(eventName, extra = {}) {
    this.sendEvent(eventName, extra);
  }
};

module.exports = Tracker;
