import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ethers, utils } from 'ethers';
import { BehaviorSubject } from 'rxjs';

import abi from '../contracts/WavePortal.json';
import { Wave } from '../models/wave.model';

declare let window: any;

@Injectable({
  providedIn: 'root',
})
export class BlockService {
  private CONTRACT_ADDRESS = '0xe9d693A392C7bB2F4483135424913aF0AB0a6822';
  private CONTRACT_ABI = abi.abi;

  public currentAccount: string = '';
  public allWaves = new BehaviorSubject<Wave[]>([]);
  public allWaves$ = this.allWaves.asObservable();

  constructor(private snackbar: MatSnackBar) {}

  /**
   * Check if wallet is connected, then set the first account as current account
   *
   * @return {*}  {Promise<boolean>}
   * @memberof BlockService
   */
  async checkIfWalletIsConnected(): Promise<string | null> {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        this.snackbar.open('🤔 Make sure you have metamask!', 'Accept', {
          duration: 6000,
        });
        return null;
      } else {
        this.snackbar.open('🔸 We have the ethereum object', '', {
          duration: 2000,
        });
      }

      /*
       * Check if we're authorized to access the user's wallet
       */
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length !== 0) {
        const account = accounts[0];
        this.snackbar.open(
          `🔒 Found an authorized account: ${account.slice(0, 6)}...`,
          'Accept',
          {
            duration: 6000,
          }
        );
        this.setCurrentAccount(account);
        this.getAllWaves();
        return account;
      } else {
        this.snackbar.open('🍃 No authorized account found', 'Accept', {
          duration: 6000,
        });
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   * Connect wallet method
   *
   * @return {*}  {Promise<string>} account connected
   * @memberof BlockService
   */
  public async connectWallet(): Promise<string | null> {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert('Get MetaMask!');
        return null;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      this.snackbar.open(`✅ Connected: ${accounts[0]}`, 'Accept', {
        duration: 6000,
      });
      this.setCurrentAccount(accounts[0]);
      this.getAllWaves();
      return accounts[0];
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   * Get the total amount of waves in the portal
   *
   * @memberof BlockService
   */
  public async getTotalWaves(): Promise<number | null> {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          this.CONTRACT_ADDRESS,
          this.CONTRACT_ABI,
          signer
        );

        let count = await wavePortalContract.getTotalWaves();
        console.log('Retrieved total wave count...', count.toNumber());
        return count.toNumber();
      } else {
        console.log("Ethereum object doesn't exist!");
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   * Wave method to send a transaction to the contract
   *
   * @return {*}  {(Promise<number | null>)}
   * @memberof BlockService
   */
  public async wave(message: string): Promise<number | null> {
    try {
      const { ethereum } = window;

      if (ethereum) {
        this.snackbar.open('🚀 Waving at T-3...3, 2, 1...🚀', '', {
          duration: 6000,
        });
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          this.CONTRACT_ADDRESS,
          this.CONTRACT_ABI,
          signer
        );

        const waveTxn = await wavePortalContract.wave(message, {
          gasLimit: 300000,
        });
        console.log('Mining...', waveTxn.hash);

        await waveTxn.wait();
        console.log('Mined -- ', waveTxn.hash);

        const count = await wavePortalContract.getTotalWaves();
        console.log('Retrieved total wave count...', count.toNumber());
        this.snackbar.open('👋🏻 Your wave was received! ✅', 'Yeah!', {
          duration: 6000,
        });
        return count.toNumber();
      } else {
        console.log("Ethereum object doesn't exist!");
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   * Get all waves from the contract
   *
   * @return {*}  {(Promise<Wave[] | null>)}
   * @memberof BlockService
   */
  public async getAllWaves(): Promise<Wave[] | null> {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          this.CONTRACT_ADDRESS,
          this.CONTRACT_ABI,
          signer
        );

        /*
         * Call the getAllWaves method from your Smart Contract
         */
        const waves = await wavePortalContract.getAllWaves();

        /*
         * We only need address, timestamp, and message in our UI so let's
         * pick those out
         */
        let wavesCleaned: Wave[] = [];
        waves.forEach((wave: any) => {
          wavesCleaned.push({
            waver: wave.waver,
            date: new Date(wave.timestamp * 1000),
            message: wave.message,
            winner: wave.winner,
          });
        });

        /*
         * Store our data in React State
         */
        this.setAllWaves(wavesCleaned);
        console.log(wavesCleaned);

        return wavesCleaned;
      } else {
        console.log("Ethereum object doesn't exist!");
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   * Listen for new waves
   *
   * @return {*}
   * @memberof BlockService
   */
  public listenToNewWaves() {
    let wavePortalContract: any;

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(
        this.CONTRACT_ADDRESS,
        this.CONTRACT_ABI,
        signer
      );
      wavePortalContract.on('NewWave', this.onNewWave.bind(this));
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off('NewWave', this.onNewWave.bind(this));
      }
    };
  }

  public onNewWave(
    address: string,
    timestamp: number,
    message: string,
    winner: boolean
  ) {
    this.snackbar.open(`🚀 New wave from ${address.slice(0, 6)}...!`, 'yeah!', {
      duration: 3000,
    });

    const newWaves = [
      ...this.allWaves.value,
      {
        waver: address,
        date: new Date(timestamp * 1000),
        message: message,
        winner: winner,
      },
    ];

    this.setAllWaves(newWaves);
  }

  private setAllWaves(waves: Wave[]) {
    this.allWaves.next(waves);
  }

  private setCurrentAccount(account: string) {
    this.currentAccount = account;
  }
}
