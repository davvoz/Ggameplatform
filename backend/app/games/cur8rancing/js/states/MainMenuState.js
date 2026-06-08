import * as THREE from 'three';
import { IState } from '../core/IState.js';
import { CarViewFactory } from '../rendering/CarViewFactory.js';
import { MenuView } from '../ui/MenuView.js';
import { LoadingRaceState } from './LoadingRaceState.js';

/**
 * Main menu: pick a car and start the race. Renders a slowly rotating 3D
 * preview of the selected model. Owns its view and preview mesh; both are
 * released on exit (Open/Closed: adding cars needs no change here).
 */
export class MainMenuState extends IState {
    enter() {
        const cars = this.ctx.catalog.all();
        this._index = Math.max(0, cars.findIndex((c) => c.id === this.ctx.session.selectedCarId));
        this._preview = null;
        this._token = 0;

        this._view = new MenuView(this.ctx.ui, {
            onPrev: () => this._step(-1),
            onNext: () => this._step(1),
            onStart: () => this._start(),
        });
        this._placeCamera();
        this._refresh();
    }

    update(dt) {
        if (this._preview) this._preview.rotation.y += dt * 0.6;
    }

    exit() {
        this._view.dispose();
        this._clearPreview();
    }

    _step(dir) {
        const cars = this.ctx.catalog.all();
        this._index = (this._index + dir + cars.length) % cars.length;
        this.ctx.session.selectedCarId = cars[this._index].id;
        this._refresh();
    }

    _refresh() {
        const model = this.ctx.catalog.all()[this._index];
        this._view.render(model);
        this._loadPreview(model);
    }

    async _loadPreview(model) {
        const token = ++this._token;
        const instance = await this.ctx.models.load(model.modelUrl);
        if (token !== this._token) return; // a newer selection won
        this._clearPreview();
        this._preview = CarViewFactory.assemble(instance, model);
        this._preview.rotation.y = Math.PI;
        this.ctx.renderer.add(this._preview);
    }

    _clearPreview() {
        if (!this._preview) return;
        this.ctx.renderer.remove(this._preview);
        this._preview = null;
    }

    _placeCamera() {
        const cam = this.ctx.renderer.camera;
        cam.position.set(4, 2.4, 7);
        cam.lookAt(new THREE.Vector3(0, 0.8, 0));
    }

    _start() {
        this.ctx.go(new LoadingRaceState(this.ctx));
    }
}
