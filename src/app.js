import Ajv from 'ajv';
import CLI from './cli.js';
import Client from './client.js';
import ejsEnginePlugin from './plugins/ejs-engine.js';
import exceptionHelpersPlugin from './plugins/exception-helpers.js';
import File from './file.js';
import headerConditionsPlugin from './plugins/header-conditions.js';
import Hooks from './hooks.js';
import HTTPContext from './context/http.js';
import Logger from './logger.js';
import Mime from './mime.js';
import MockClient from './client/mock.js';
import Renderer from './renderer.js';
import Router from './router.js';
import Session from './session.js';
import Static from './static.js';
import TestClient from './client/test.js';
import viewHelpersPlugin from './plugins/view-helpers.js';
import WebSocketContext from './context/websocket.js';

export default class App {
  constructor (options = {}) {
    this.cli = new CLI(this);
    this.client = new Client();
    this.config = options.config ?? {};
    this.detectImport = options.detectImport ?? true;
    this.exceptionFormat = options.exceptionFormat ?? 'html';
    this.hooks = new Hooks();
    this.home = undefined;
    this.mime = new Mime();
    this.models = {};
    this.mojo = undefined;
    this.renderer = new Renderer();
    this.router = new Router();
    this.secrets = options.secrets ?? ['Insecure'];
    this.session = new Session(this);
    this.static = new Static();
    this.validator = new Ajv();

    this._httpContextClass = class extends HTTPContext {};
    this._mode = options.mode ?? process.env.NODE_ENV ?? 'development';
    this._server = null;
    this._websocketContextClass = class extends WebSocketContext {};

    const isDev = this._mode === 'development';
    this.log = new Logger({historySize: isDev ? 10 : 0, level: isDev ? 'trace' : 'info'});

    this.plugin(ejsEnginePlugin);
    this.plugin(exceptionHelpersPlugin);
    this.plugin(headerConditionsPlugin);
    this.plugin(viewHelpersPlugin);
  }

  addHelper (name, fn) {
    return this.decorateContext(name, function (...args) {
      return fn(this, ...args);
    });
  }

  addHook (name, fn) {
    this.hooks.addHook(name, fn);
    return this;
  }

  any (methods, pattern, constraints, fn) {
    return this.router.any(methods, pattern, constraints, fn);
  }

  decorateContext (name, fn) {
    if (HTTPContext.prototype[name] !== undefined || WebSocketContext[name] !== undefined) {
      throw new Error(`The name "${name}" is already used in the prototype chain`);
    }

    if (typeof fn.get === 'function' || typeof fn.set === 'function') {
      Object.defineProperty(this._httpContextClass.prototype, name, fn);
      Object.defineProperty(this._websocketContextClass.prototype, name, fn);
    } else {
      this._httpContextClass.prototype[name] = fn;
      this._websocketContextClass.prototype[name] = fn;
    }

    return this;
  }

  delete (pattern, constraints, fn) {
    return this.router.delete(pattern, constraints, fn);
  }

  get (pattern, constraints, fn) {
    return this.router.get(pattern, constraints, fn);
  }

  async handleRequest (ctx) {
    try {
      if (ctx.isWebSocket === true) {
        if (await this.hooks.runHook('websocket', ctx) === true) return;
        await this.router.dispatch(ctx);
        return;
      }

      if (await this.hooks.runHook('request', ctx) === true) return;
      if (await this.static.dispatch(ctx) === true) return;
      if (await this.router.dispatch(ctx) === true) return;
      await ctx.notFound();
    } catch (error) {
      await ctx.exception(error);
    }
  }

  get mode () {
    return this._mode;
  }

  newHTTPContext (req, res, options) {
    return new this._httpContextClass(this, req, res, options);
  }

  newMockClient (options) {
    return MockClient.newMockClient(this, options);
  }

  newTestClient (options) {
    return TestClient.newTestClient(this, options);
  }

  newWebSocketContext (req, options) {
    return new this._websocketContextClass(this, req, options);
  }

  options (pattern, constraints, fn) {
    return this.router.options(pattern, constraints, fn);
  }

  patch (pattern, constraints, fn) {
    return this.router.patch(pattern, constraints, fn);
  }

  plugin (plugin, options) {
    return plugin(this, options);
  }

  post (pattern, constraints, fn) {
    return this.router.post(pattern, constraints, fn);
  }

  put (pattern, constraints, fn) {
    return this.router.put(pattern, constraints, fn);
  }

  get server () {
    return this._server?.deref() ?? null;
  }

  set server (server) {
    this._server = new WeakRef(server);
  }

  start (command, ...args) {
    if (this.detectImport === true && process.argv[1] !== File.callerFile().toString()) return;
    return this.cli.start(command, ...args);
  }

  under (methods, pattern, constraints, fn) {
    return this.router.under(methods, pattern, constraints, fn);
  }

  async warmup () {
    await this.renderer.warmup();
    await this.router.warmup();
  }

  websocket (pattern, constraints, fn) {
    return this.router.websocket(pattern, constraints, fn);
  }
}