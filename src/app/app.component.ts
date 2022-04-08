import { AfterViewInit, Component, OnInit } from '@angular/core';
import { BlockService } from './services/block.service';

import * as AOS from 'aos';
import { Subscription } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Wave } from './models/wave.model';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  currentAccount: string | null = null;
  totalWaves: number | null = 0;
  allWaveMessages: Wave[] | null = [];

  messageControl = new FormControl('');

  subscription = new Subscription();
  isMobile: boolean = false;
  constructor(
    private blockService: BlockService,
    private breakpoint: BreakpointObserver,
    private snackbar: MatSnackBar
  ) {
    this.blockService.checkIfWalletIsConnected().then((account) => {
      if (account) {
        this.currentAccount = account;
        this.blockService.listenToNewWaves();
      }
    });
  }

  ngOnInit(): void {
    this.subscription.add(
      this.breakpoint
        .observe([Breakpoints.HandsetPortrait])
        .subscribe((res) => {
          if (res.matches) {
            this.isMobile = true;
          } else {
            this.isMobile = false;
          }
        })
    );

    this.subscription.add(
      this.blockService.allWaves$.subscribe((waves) => {
        this.totalWaves = waves.length;
        this.allWaveMessages = waves.sort((a, b) => {
          return b.date.getTime() - a.date.getTime();
        });
      })
    );
  }

  ngAfterViewInit(): void {
    AOS.init();
  }

  wave(): void {
    try {
      if (this.currentAccount) {
        if (this.messageControl.value) {
          this.blockService
            .wave(this.messageControl.value)
            .then((totalWaves) => {
              if (totalWaves) {
                this.totalWaves = totalWaves;

                this.messageControl.reset();
              } else {
                this.totalWaves = 0;
              }
            });
        } else {
          this.snackbar.open('🙀 And your message ?', 'Oops!', {
            duration: 6000,
          });
        }
      } else {
        this.connectWallet();
      }
    } catch (error) {
      console.log(error);
    }
  }

  connectWallet(): void {
    this.blockService.connectWallet().then(async (account) => {
      if (account) {
        this.currentAccount = account;

        this.blockService.listenToNewWaves();
      }
    });
  }
}
