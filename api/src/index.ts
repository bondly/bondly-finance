import {
    LambdaGlobalContext, UnifyreBackendProxyModule, UnifyreBackendProxyService,
    KmsCryptor, AwsEnvs, SecretsProvider,
} from 'aws-lambda-helper';
import {HttpHandler} from "./HttpHandler";
import {
    ConsoleLogger,
    Container,
    LoggerFactory, Module,
} from "ferrum-plumbing";
import { ClientModule, UnifyreExtensionKitClient } from 'unifyre-extension-sdk';
import { getEnv } from './MongoTypes';
import { SmartContratClient } from './SmartContractClient';
import { KMS } from 'aws-sdk';
import { P2pSwapConfig } from './Types';
import { P2pSwap } from './P2pSwapService';

const global = { init: false };
const P2P_SWAP_APP_ID = 'P2P_SWAP_APP_ID';

// DEV - only use for local. Remote dev is considered prod
const IS_DEV = !!process.env.IS_DEV;
const P2P_SWAP_SMART_CONTRACT_ADDRESS_DEV = '0x32d7c376594bb287a252ffba01e70ad56174702a';

const P2P_SWAP_SMART_CONTRACT_ADDRESS_PROD = {
    'ETHEREUM': '0xda3c8a854413e34e4b550d1335ced146c17736cc',
    'RINKEBY': '0x33e547bd9c12ffbd49fc261de56f86296554a62c'
};
const POOL_DROP_ADDRESS = IS_DEV ?
    { 'ETHEREUM': P2P_SWAP_SMART_CONTRACT_ADDRESS_DEV,
      'RINKEBY': P2P_SWAP_SMART_CONTRACT_ADDRESS_DEV } : P2P_SWAP_SMART_CONTRACT_ADDRESS_PROD;

async function init() {
    if (global.init) {
        return LambdaGlobalContext.container();
    }
    const container = await LambdaGlobalContext.container();
    await container.registerModule(new P2pSwapModule());
    global.init = true;
    return container;
}

// Once registered this is the handler code for lambda_template
export async function handler(event: any, context: any) {
    try {
        const container = await init();
        const lgc = container.get<LambdaGlobalContext>(LambdaGlobalContext);
        return await lgc.handleAsync(event, context);
    } catch (e) {
        console.error(e);
        return {
            body: e.message,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            isBase64Encoded: false,
            statusCode: 500,
        }
    }
}

export class P2pSwapModule implements Module {
    async configAsync(container: Container) {
        // Only uncomment to encrypt sk
        // await encryptEnv('SK', container);

        const region = process.env.AWS_REGION || process.env[AwsEnvs.AWS_DEFAULT_REGION] || 'us-east-2';
        const p2pSwapConfArn = process.env[AwsEnvs.AWS_SECRET_ARN_PREFIX + 'UNI_APP_POOL_DROP'];
        let p2pSwapConfig: P2pSwapConfig = {} as any;
        if (p2pSwapConfArn) {
            p2pSwapConfig = await new SecretsProvider(region, p2pSwapConfArn).get();
        } else {
            p2pSwapConfig = {
                database: {
                    connectionString: getEnv('MONGOOSE_CONNECTION_STRING'),
                },
                authRandomKey: getEnv('RANDOM_SECRET'),
                signingKeyHex: getEnv('REQUEST_SIGNING_KEY'),
                web3ProviderEthereum: getEnv('WEB3_PROVIDER_ETHEREUM'),
                web3ProviderRinkeby: getEnv('WEB3_PROVIDER_RINKEBY'),
                backend: getEnv('UNIFYRE_BACKEND'),
                region,
                cmkKeyArn: getEnv('CMK_KEY_ARN'),
            } as P2pSwapConfig;
        }
        // makeInjectable('CloudWatch', CloudWatch);
        // container.register('MetricsUploader', c =>
        //     new CloudWatchClient(c.get('CloudWatch'), 'WalletAddressManager', [
        //         { Name:'Application', Value: 'WalletAddressManager' } as Dimension,
        //     ]));
        // container.registerSingleton(MetricsService, c => new MetricsService(
        //   new MetricsAggregator(),
        //   { period: 3 * 60 * 1000 } as MetricsServiceConfig,
        //   c.get('MetricsUploader'),
        //   c.get(LoggerFactory),
        // ));


        // This will register sdk modules. Good for client-side, for server-side we also need the next
        // step
        await container.registerModule(new ClientModule(p2pSwapConfig.backend, P2P_SWAP_APP_ID));
        
        // Decrypt the signing key
        let signingKeyHex = p2pSwapConfig.signingKeyHex;
        if (p2pSwapConfig.signingKey) { // For prod only
            container.register('KMS', () => new KMS({region: p2pSwapConfig.region}));
            container.register(KmsCryptor, c => new KmsCryptor(c.get('KMS'),
                p2pSwapConfig.cmkKeyArn));
            const jsonKey = p2pSwapConfig.signingKey!;
            signingKeyHex = await container.get<KmsCryptor>(KmsCryptor).decryptToHex(jsonKey);
        }

        // Note: we register UnifyreBackendProxyModule for the backend applications
        // this will ensure that the ExtensionClient does not cache the token between different
        // requests, and also it will ensure that client will sign the requests using sigining_key.
        await container.registerModule(
            new UnifyreBackendProxyModule(P2P_SWAP_APP_ID, p2pSwapConfig.authRandomKey,
                signingKeyHex!,));

        container.registerSingleton(SmartContratClient,
            () => new SmartContratClient(
                p2pSwapConfig.web3ProviderEthereum,
                p2pSwapConfig.web3ProviderRinkeby,
                POOL_DROP_ADDRESS));
        container.register('JsonStorage', () => new Object());
        container.registerSingleton(P2pSwap,
                c => new P2pSwap(
                    () => c.get(UnifyreExtensionKitClient),
                    c.get(SmartContratClient),
                    ));

        container.registerSingleton('LambdaHttpHandler',
                c => new HttpHandler(c.get(UnifyreBackendProxyService), c.get(P2pSwap)));
        container.registerSingleton("LambdaSqsHandler",
            () => new Object());
        container.register(LoggerFactory,
            () => new LoggerFactory((name: string) => new ConsoleLogger(name)));
        await container.get<P2pSwap>(P2pSwap).init(p2pSwapConfig.database);
    }
}

async function encryptEnv(env: string, c: Container) {
    // Run this once on the lambda function to print out the encrypted private key
    // then use this encrypted private key as the app parameter going forward
    // and discard the plain text private key.
    const sk = getEnv(env);
    const cmkKeyArn = getEnv('CMK_KEY_ARN');
    c.register('KMS', () => new KMS({region: 'us-east-2'}));
    c.register(KmsCryptor, _c => new KmsCryptor(_c.get('KMS'),
        cmkKeyArn));
    const enc = await c.get<KmsCryptor>(KmsCryptor).encryptHex(sk);
    console.log('ENCRYPTED');
    console.log(enc);
    throw new Error('DEV ONLY');
}