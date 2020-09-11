# bondly-api

## How to test locally

1. Set up the wallet dev environment with a test database
2. Create a pooldrop between two parties
3. As a party, claim it
4. Open database and the state of the link, so that it can be saved back after each test
5. Start Ganache
6. Deploy pooldrop + token to Ganache
7. Add new token (DEV_TOK) to Uni. This will be a brand new token ID.
8. Run nodewatcher with Ganache and local.
9. Run addressman with Ganache and local.
10. Sign and send, make sure:
  - Gas limit is correct
  - Overriding gasLimit results in a failed tx
  - The tx times out 


## How to test on prod

1. First, ssh into the test server.
2. Run the docker-compose to spin up a test host + Ganache + node watcher + address manager.
2. Point your web3 api to the test Ganache.
