import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListComponent } from './pages/list/list.component';
import { WebsiteDetailComponent } from './pages/website-detail/website-detail.component';

const routes: Routes = [
  {
    path: '',
    component: ListComponent,
  },

  {
    path: 'detail/:projectId',
    component: WebsiteDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
