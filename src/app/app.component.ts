import { Component, OnInit } from '@angular/core';
import { DataState } from './states/data.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  DataState = DataState;

  nextReloadInSeconds = 10;
  reloadTimeout = 10;

  liveUpdateInterval: ReturnType<typeof setTimeout> | undefined;

  constructor(public dataState: DataState) {}

  ngOnInit() {
    this.fetchData();
    this.dataState.reloadSettings();

    this.liveUpdateInterval = setInterval(async () => {
      this.nextReloadInSeconds--;

      if (this.nextReloadInSeconds <= 0) {
        await this.fetchData();
      }
    }, 1000);
  }

  private async fetchData() {
    this.nextReloadInSeconds = this.reloadTimeout;
    await this.dataState.reloadMainStatus();
  }
}
