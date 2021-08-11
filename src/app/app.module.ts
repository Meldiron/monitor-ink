import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxsDataPluginModule } from '@ngxs-labs/data';
import { NgxsModule } from '@ngxs/store';
import { environment } from 'src/environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ListComponent } from './pages/list/list.component';
import { WebsiteDetailComponent } from './pages/website-detail/website-detail.component';
import { DataState } from './states/data.state';
import {
  NGXS_DATA_STORAGE_CONTAINER,
  NGXS_DATA_STORAGE_EXTENSION,
} from '@ngxs-labs/data/storage';

@NgModule({
  declarations: [AppComponent, ListComponent, WebsiteDetailComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,

    NgxsModule.forRoot([DataState], {
      developmentMode: !environment.production,
    }),
    NgxsDataPluginModule.forRoot(),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
