import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataState } from 'src/app/states/data.state';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements OnInit {
  openedGroupIds: string[] = [];

  DataState = DataState;

  constructor(private router: Router, public dataState: DataState) {}

  ngOnInit(): void {}

  onToggleGroup(groupId: string): void {
    const isOpened = this.openedGroupIds.some((gId) => groupId === gId);
    if (isOpened) {
      this.openedGroupIds = this.openedGroupIds.filter(
        (gId) => gId !== groupId
      );
    } else {
      this.openedGroupIds.push(groupId);
    }
  }

  onOpenDetail(key: string) {
    this.router.navigateByUrl('/detail/' + key);
  }

  onStopEvent(event: Event) {
    event.stopPropagation();
  }
}
