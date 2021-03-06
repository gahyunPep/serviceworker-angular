import { IndexedDBService } from './services/indexed-db.service';
import { ApplicationRef, Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { interval } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'serviceworker-angular';
  apiData: any;
  private publicKey =
    'BBQTRzmj3bF1RQ45QmWpPujV_ELBnvkVgNK3OHCsUbMsDmq9rU9EB7xko8Wd95WaV_CsvxSv53ADoZKHkJD1GJE';

  constructor(
    private http: HttpClient,
    private update: SwUpdate,
    private appRef: ApplicationRef,
    private swPush: SwPush,
    private indexedDBService: IndexedDBService,
    private _snackBar: MatSnackBar
  ) {
    this.updateClient();
    this.checkUpdate();
  }

  ngOnInit() {
    // check if user is online or not approach 1- this will only run once when it is loaded
    // if (!navigator.onLine) {
    //   alert('Please check your internet connection');
    // }

    addEventListener('offline', (event) => {
      this._snackBar.open('Please check your internet connection', 'OK', {
        duration: 5000,
      });
      // you can do background sync here
    });

    addEventListener('online', (event) => {
      this._snackBar.open('You are online now', 'OK', {
        duration: 2000,
      });
    });

    this.pushSubscription(); // better to put under the event

    this.swPush.messages.subscribe((message) => console.log(message));

    this.swPush.notificationClicks.subscribe(({ action, notification }) => {
      window.open(notification.data.url);
      // use only fetch no httpclient
    });

    this.http.get(`http://dummy.restapiexample.com/api/v1/employees`).subscribe(
      (res: any) => {
        this.apiData = res.data;
      },
      (err) => {
        console.error(err);
      }
    );
  }

  updateClient() {
    if (!this.update.isEnabled) {
      console.log('Not Enabled');
      return;
    }
    this.update.available.subscribe((event) => {
      console.log(`current`, event.current, `available `, event.available);
      if (confirm('update available for the app please conform')) {
        this.update.activateUpdate().then(() => location.reload());
      }
    });

    this.update.activated.subscribe((event) => {
      console.log(`current`, event.previous, `available `, event.current);
    });
  }

  checkUpdate() {
    this.appRef.isStable.subscribe((isStable) => {
      if (isStable) {
        const timeInterval = interval(8 * 60 * 60 * 1000);

        timeInterval.subscribe(() => {
          this.update.checkForUpdate().then(() => console.log('checked'));
          console.log('update checked');
        });
      }
    });
  }

  // push notification
  pushSubscription() {
    if (!this.swPush.isEnabled) {
      console.log('Notification is not enabled');
      return;
    }
    this.swPush
      .requestSubscription({
        serverPublicKey: this.publicKey,
      })
      .then((sub) => {
        // supposed to send post request to the server with sub obj
        console.log(JSON.stringify(sub));
      })
      .catch((err) => console.log(err));
  }

  // Background sync in service worker
  postSync() {
    // api call
    let obj = {
      name: 'amber',
    };
    this.http.post('http://localhost:3000/data', obj).subscribe(
      (res) => {
        console.log(res);
      },
      (err) => {
        this.indexedDBService
          .addUser('Amber Lee')
          .then(this.backgroundSync)
          .catch(console.log);
      }
    );
  }

  backgroundSync() {
    navigator.serviceWorker.ready
      .then((swRegistration) => swRegistration.sync.register('post-data'))
      .catch((err) => console.log(err));
  }
}
