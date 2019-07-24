import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingAboutComponent } from './landingAbout/landingAbout.component';
import { LandingPageComponent } from './landingPage/landingPage.component';
import { NoidComponent } from './landing/noid.component';
import { NerdmComponent } from './landing/nerdm.component';
// import { SearchResolve } from './landing/search-service.resolve';
import { ErrorComponent, UserErrorComponent } from './landing/error.component';
import { DatacartComponent} from './datacart/datacart.component';

const routes: Routes = [
  { path: '', redirectTo: '/about', pathMatch: 'full' },

  { path: 'about',  children: [
    {
      path: '',
     component: LandingAboutComponent
    } ] 
  },

 { path: 'od/id/:id',
   children: [
   {
     path: '',
     component: LandingPageComponent,
     
   }
 ]}, {
  path: 'od/id/ark:/88434/:id',
  children: [
    {
      path: '',
      component: LandingPageComponent,
      
    }
  ]
},{
  path: 'od/id',
  children: [
    {
      path: '',
      component: NoidComponent,
      
    }
  ]
}
,{
  path: 'nerdm',
  children: [
    {
      path: '',
      component: NerdmComponent
    }
  ]
},{
  path: 'datacart/:mode',
  children: [
      {
        path: '',
        component: DatacartComponent
      }
  ]
},{
  path: 'error/:id',
  children: [
    {
      path: '',
      component: ErrorComponent
    }
  ]
}
,{
  path: 'usererror/:id',
  children: [
    {
      path: '',
      component: UserErrorComponent
    }
  ]
}
];

@NgModule({
  imports: [ RouterModule.forRoot(routes,{ initialNavigation: 'enabled' }) ],
  exports: [ RouterModule ],
  // providers: [ SearchResolve ]
})
export class AppRoutingModule {}
