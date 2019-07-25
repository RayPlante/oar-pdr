import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingAboutComponent } from './landingAbout/landingAbout.component';
import { LandingPageComponent } from './landingPage/landingPage.component';
import { NoidComponent } from './landing/noid.component';
import { NerdmComponent } from './landing/nerdm.component';
import { NotFoundComponent, InternalErrorComponent } from './errors/errors.module';
import { DatacartComponent} from './datacart/datacart.component';

const routes: Routes = [
    { path: '', redirectTo: '/about', pathMatch: 'full' },

    { path: 'about',             component: LandingAboutComponent  }, 
    { path: 'od/id',             
      children: [
        { path: '',              component: NoidComponent          },
        { path: ':id',           component: LandingPageComponent   }
      ]
    },
    { path: 'od/id/ark:/88434/', 
      children: [
        { path: '',              component: NoidComponent          },
        { path: ':id',           component: LandingPageComponent   }
      ]
    },
    { path: 'nerdm',             component: NerdmComponent         },
    { path: 'datacart/:mode',    component: DatacartComponent      },
    { path: 'not-found',         
      children: [
        { path: '',              component: NotFoundComponent      },
        { path: ':id',           component: NotFoundComponent      }
      ]
    },
    { path: 'int-error',         
      children: [
        { path: '',              component: InternalErrorComponent },
        { path: ':id',           component: InternalErrorComponent }
      ]
    },
    { path: '**',                component: NotFoundComponent      }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, { initialNavigation: 'enabled' }) ],
  exports: [ RouterModule ],
  // providers: [ SearchResolve ]
})
export class AppRoutingModule {}
