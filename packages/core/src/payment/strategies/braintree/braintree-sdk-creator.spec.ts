import { BraintreeScriptLoader } from '@bigcommerce/checkout-sdk/braintree-utils';

import { NotInitializedError } from '../../../common/error/errors';

import {
    BraintreeClient,
    BraintreeDataCollector,
    BraintreeModuleCreator,
    BraintreeThreeDSecure,
    BraintreeVenmoCheckout,
    BraintreeVisaCheckout,
} from './braintree';
import BraintreeSDKCreator from './braintree-sdk-creator';
import {
    getClientMock,
    getDataCollectorMock,
    getDeviceDataMock,
    getHostedFieldsMock,
    getModuleCreatorMock,
    getModuleCreatorNewMock,
    getThreeDSecureMock,
    getVenmoCheckoutMock,
    getVisaCheckoutMock,
} from './braintree.mock';

describe('Braintree SDK Creator', () => {
    let braintreeScriptLoader: BraintreeScriptLoader;
    let clientMock: BraintreeClient;
    let clientCreatorMock: BraintreeModuleCreator<BraintreeClient>;

    beforeEach(() => {
        clientMock = getClientMock();
        clientCreatorMock = getModuleCreatorMock(clientMock);
        braintreeScriptLoader = {} as BraintreeScriptLoader;
    });

    describe('#constructor()', () => {
        it('creates and instance of the sdk Creator', () => {
            const braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);

            expect(braintreeSDKCreator).toBeInstanceOf(BraintreeSDKCreator);
        });
    });

    describe('#getClient()', () => {
        beforeEach(() => {
            braintreeScriptLoader.loadClient = jest
                .fn()
                .mockReturnValue(Promise.resolve(clientCreatorMock));
        });

        it('uses the right arguments to create the client', async () => {
            const braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);

            braintreeSDKCreator.initialize('clientToken');
            await braintreeSDKCreator.getClient();

            expect(clientCreatorMock.create).toHaveBeenCalledWith({ authorization: 'clientToken' });
        });

        it('returns a copy of the client', async () => {
            const braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);

            braintreeSDKCreator.initialize('clientToken');

            const client = await braintreeSDKCreator.getClient();

            expect(client).toBe(clientMock);
        });

        it('always returns the same instance of the client', async () => {
            const braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);

            braintreeSDKCreator.initialize('clientToken');

            const client1 = await braintreeSDKCreator.getClient();
            const client2 = await braintreeSDKCreator.getClient();

            expect(braintreeScriptLoader.loadClient).toHaveBeenCalledTimes(1);
            expect(clientCreatorMock.create).toHaveBeenCalledTimes(1);
            expect(client1).toBe(client2);
        });

        it('throws if no client token is provided', () => {
            const braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);

            expect(() => braintreeSDKCreator.getClient()).toThrow(expect.any(NotInitializedError));
        });
    });

    describe('#get3DS()', () => {
        let threeDSecureMock: BraintreeThreeDSecure;
        let threeDSecureCreatorMock: BraintreeModuleCreator<BraintreeThreeDSecure>;
        let braintreeSDKCreator: BraintreeSDKCreator;

        beforeEach(() => {
            threeDSecureMock = getThreeDSecureMock();
            threeDSecureCreatorMock = getModuleCreatorMock(threeDSecureMock);
            braintreeScriptLoader.load3DS = jest
                .fn()
                .mockReturnValue(Promise.resolve(threeDSecureCreatorMock));
            braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);
            jest.spyOn(braintreeSDKCreator, 'getClient').mockReturnValue(
                Promise.resolve(clientMock),
            );
        });

        it('returns a promise that resolves to the 3ds client', async () => {
            const threeDSecure = await braintreeSDKCreator.get3DS();

            expect(threeDSecureCreatorMock.create).toHaveBeenCalledWith({
                client: clientMock,
                version: 2,
            });
            expect(threeDSecure).toBe(threeDSecureMock);
        });

        it('always returns the same instance of the 3ds client', async () => {
            const threeDSecure1 = await braintreeSDKCreator.get3DS();
            const threeDSecure2 = await braintreeSDKCreator.get3DS();

            expect(threeDSecure1).toBe(threeDSecure2);
            expect(braintreeScriptLoader.load3DS).toHaveBeenCalledTimes(1);
            expect(threeDSecureCreatorMock.create).toHaveBeenCalledTimes(1);
        });

        it('throws if getting the client throws', () => {
            const errorMessage = 'some_error';

            jest.spyOn(braintreeSDKCreator, 'getClient').mockImplementation(() => {
                throw new Error(errorMessage);
            });

            expect(() => braintreeSDKCreator.get3DS()).toThrow(errorMessage);
        });
    });

    describe('#getDataCollector()', () => {
        let dataCollectorMock: BraintreeDataCollector;
        let dataCollectorCreatorMock: BraintreeModuleCreator<BraintreeDataCollector>;
        let braintreeSDKCreator: BraintreeSDKCreator;

        beforeEach(() => {
            dataCollectorMock = getDataCollectorMock();
            dataCollectorCreatorMock = getModuleCreatorNewMock(dataCollectorMock);
            braintreeScriptLoader.loadDataCollector = jest
                .fn()
                .mockReturnValue(Promise.resolve(dataCollectorCreatorMock));
            braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);
            jest.spyOn(braintreeSDKCreator, 'getClient').mockReturnValue(
                Promise.resolve(clientMock),
            );
        });

        it('uses the right parameters to instantiate a data collector', async () => {
            await braintreeSDKCreator.getDataCollector();

            expect(dataCollectorCreatorMock.create).toHaveBeenCalledWith({
                client: clientMock,
                kount: true,
            });

            await braintreeSDKCreator.getDataCollector({ paypal: true });

            expect(dataCollectorCreatorMock.create).toHaveBeenCalledWith({
                client: clientMock,
                kount: true,
                paypal: true,
            });
        });

        it('always returns the same instance of the data collector', async () => {
            const dataCollector1 = await braintreeSDKCreator.getDataCollector();
            const dataCollector2 = await braintreeSDKCreator.getDataCollector();

            expect(dataCollector1).toBe(dataCollector2);
            expect(braintreeScriptLoader.loadDataCollector).toHaveBeenCalledTimes(1);
            expect(dataCollectorCreatorMock.create).toHaveBeenCalledTimes(1);
        });

        it('returns different data collector instance if it is used for PayPal', async () => {
            const dataCollector = await braintreeSDKCreator.getDataCollector();
            const paypalDataCollector = await braintreeSDKCreator.getDataCollector({
                paypal: true,
            });

            expect(dataCollector).not.toBe(paypalDataCollector);
            expect(braintreeSDKCreator.getDataCollector()).resolves.toBe(dataCollector);
            expect(braintreeSDKCreator.getDataCollector({ paypal: true })).resolves.toBe(
                paypalDataCollector,
            );
        });

        it('returns the data collector information', async () => {
            const dataCollector = await braintreeSDKCreator.getDataCollector();

            expect(dataCollector).toEqual(
                expect.objectContaining({ deviceData: getDeviceDataMock() }),
            );
        });

        it('catches the KOUNT_IS_NOT_ENABLED error', async () => {
            jest.spyOn(dataCollectorCreatorMock, 'create').mockReturnValue(
                Promise.reject({ code: 'DATA_COLLECTOR_KOUNT_NOT_ENABLED' }),
            );

            await expect(braintreeSDKCreator.getDataCollector()).resolves.toEqual(
                expect.objectContaining({ deviceData: undefined }),
            );
        });

        it('throws if some other error is returned', async () => {
            jest.spyOn(dataCollectorCreatorMock, 'create').mockReturnValue(
                Promise.reject({ code: 'OTHER_RANDOM_ERROR' }),
            );

            await expect(braintreeSDKCreator.getDataCollector()).rejects.toEqual({
                code: 'OTHER_RANDOM_ERROR',
            });
        });
    });

    describe('#getVisaCheckout()', () => {
        let visaCheckoutMock: BraintreeVisaCheckout;
        let visaCheckoutCreatorMock: BraintreeModuleCreator<BraintreeVisaCheckout>;
        let braintreeSDKCreator: BraintreeSDKCreator;

        beforeEach(() => {
            visaCheckoutMock = getVisaCheckoutMock();
            visaCheckoutCreatorMock = getModuleCreatorMock(visaCheckoutMock);
            braintreeScriptLoader.loadVisaCheckout = jest
                .fn()
                .mockReturnValue(Promise.resolve(visaCheckoutCreatorMock));
            braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);
            jest.spyOn(braintreeSDKCreator, 'getClient').mockReturnValue(
                Promise.resolve(clientMock),
            );
        });

        it('returns a promise that resolves to the VisaCheckout client', async () => {
            const visaCheckout = await braintreeSDKCreator.getVisaCheckout();

            expect(visaCheckoutCreatorMock.create).toHaveBeenCalledWith({ client: clientMock });
            expect(visaCheckout).toBe(visaCheckoutMock);
        });

        it('always returns the same instance of the VisaCheckout client', async () => {
            const visaCheckout1 = await braintreeSDKCreator.getVisaCheckout();
            const visaCheckout2 = await braintreeSDKCreator.getVisaCheckout();

            expect(visaCheckout1).toBe(visaCheckout2);
            expect(braintreeScriptLoader.loadVisaCheckout).toHaveBeenCalledTimes(1);
            expect(visaCheckoutCreatorMock.create).toHaveBeenCalledTimes(1);
        });

        it('throws if getting the client throws', () => {
            const errorMessage = 'some_error';

            jest.spyOn(braintreeSDKCreator, 'getClient').mockImplementation(() => {
                throw new Error(errorMessage);
            });

            expect(() => braintreeSDKCreator.getVisaCheckout()).toThrow(errorMessage);
        });
    });

    describe('#getVenmoCheckoutMock()', () => {
        let braintreeVenmoCheckoutMock: BraintreeVenmoCheckout;
        let braintreeVenmoCheckoutCreatorMock: BraintreeModuleCreator<BraintreeVenmoCheckout>;
        let braintreeSDKCreator: BraintreeSDKCreator;

        beforeEach(() => {
            braintreeVenmoCheckoutMock = getVenmoCheckoutMock();
            braintreeVenmoCheckoutCreatorMock = getModuleCreatorMock(braintreeVenmoCheckoutMock);
            braintreeScriptLoader.loadVenmoCheckout = jest
                .fn()
                .mockReturnValue(Promise.resolve(braintreeVenmoCheckoutCreatorMock));
            braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);
            jest.spyOn(braintreeSDKCreator, 'getClient').mockReturnValue(
                Promise.resolve(clientMock),
            );
        });

        it('returns a promise that resolves to the BraintreeVenmoCheckout', async () => {
            const onSuccessCallback = jest.fn();
            const onErrorCallback = jest.fn();
            const braintreeVenmoCheckout = await braintreeSDKCreator.getVenmoCheckout(
                onSuccessCallback,
                onErrorCallback,
            );

            expect(braintreeVenmoCheckoutCreatorMock.create).toHaveBeenCalled();
            expect(braintreeVenmoCheckout).toBe(braintreeVenmoCheckoutMock);
        });

        it('create a venmo by passing an additional configuration to it', async () => {
            const onSuccessCallback = jest.fn();
            const onErrorCallback = jest.fn();
            const braintreeVenmoCheckout = await braintreeSDKCreator.getVenmoCheckout(
                onSuccessCallback,
                onErrorCallback,
                {
                    mobileWebFallBack: false,
                    allowDesktop: false,
                },
            );

            expect(braintreeVenmoCheckoutCreatorMock.create).toHaveBeenCalledWith(
                expect.objectContaining({ mobileWebFallBack: false, allowDesktop: false }),
                expect.any(Function),
            );
            expect(braintreeVenmoCheckout).toBe(braintreeVenmoCheckoutMock);
        });

        it('always returns the same instance of the BraintreeVenmoCheckout client', async () => {
            const onSuccessCallback = jest.fn();
            const onErrorCallback = jest.fn();

            const braintreeVenmoCheckout1 = await braintreeSDKCreator.getVenmoCheckout(
                onSuccessCallback,
                onErrorCallback,
            );
            const braintreeVenmoCheckout2 = await braintreeSDKCreator.getVenmoCheckout(
                onSuccessCallback,
                onErrorCallback,
            );

            expect(braintreeVenmoCheckout1).toBe(braintreeVenmoCheckout2);
            expect(braintreeScriptLoader.loadVenmoCheckout).toHaveBeenCalledTimes(1);
            expect(braintreeVenmoCheckoutCreatorMock.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('#createHostedFields()', () => {
        let braintreeSDKCreator: BraintreeSDKCreator;

        beforeEach(() => {
            braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);
        });

        it('returns a promise that resolves to the hosted fields instance', async () => {
            const hostedFieldsMock = getHostedFieldsMock();
            const hostedFieldsCreatorMock = getModuleCreatorMock(hostedFieldsMock);

            // TODO: remove ts-ignore and update test with related type (PAYPAL-4383)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            braintreeScriptLoader.loadClient = jest.fn(() => Promise.resolve(clientCreatorMock));
            // TODO: remove ts-ignore and update test with related type (PAYPAL-4383)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            braintreeScriptLoader.loadHostedFields = jest.fn(() =>
                Promise.resolve(hostedFieldsCreatorMock),
            );

            braintreeSDKCreator.initialize('client_token');

            expect(await braintreeSDKCreator.createHostedFields({ fields: {} })).toEqual(
                hostedFieldsMock,
            );
        });

        it('throws if unable to create hosted fields instance', async () => {
            const error = new Error();

            // TODO: remove ts-ignore and update test with related type (PAYPAL-4383)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            braintreeScriptLoader.loadClient = jest.fn(() => Promise.resolve(clientCreatorMock));
            braintreeScriptLoader.loadHostedFields = jest.fn(() => Promise.reject(error));

            braintreeSDKCreator.initialize('client_token');

            try {
                await braintreeSDKCreator.createHostedFields({ fields: {} });
            } catch (thrown) {
                expect(thrown).toEqual(error);
            }
        });
    });

    describe('#teardown()', () => {
        let braintreeSDKCreator: BraintreeSDKCreator;
        let dataCollectorMock: BraintreeDataCollector;
        let threeDSecureMock: BraintreeThreeDSecure;
        let visaCheckoutMock: BraintreeVisaCheckout;
        let braintreeVenmoCheckout: BraintreeVenmoCheckout;

        beforeEach(() => {
            dataCollectorMock = getDataCollectorMock();
            threeDSecureMock = getThreeDSecureMock();
            visaCheckoutMock = getVisaCheckoutMock();
            braintreeVenmoCheckout = getVenmoCheckoutMock();

            braintreeScriptLoader.loadDataCollector = jest
                .fn()
                .mockReturnValue(Promise.resolve(getModuleCreatorMock(dataCollectorMock)));
            braintreeScriptLoader.load3DS = jest
                .fn()
                .mockReturnValue(Promise.resolve(getModuleCreatorMock(threeDSecureMock)));
            braintreeScriptLoader.loadVisaCheckout = jest
                .fn()
                .mockReturnValue(Promise.resolve(getModuleCreatorMock(visaCheckoutMock)));
            braintreeScriptLoader.loadClient = jest
                .fn()
                .mockReturnValue(Promise.resolve(getModuleCreatorMock(clientMock)));
            braintreeScriptLoader.loadVenmoCheckout = jest
                .fn()
                .mockReturnValue(Promise.resolve(getModuleCreatorMock(braintreeVenmoCheckout)));

            braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);
            braintreeSDKCreator.initialize('clientToken');
        });

        it('calls teardown in all the dependencies', async () => {
            await braintreeSDKCreator.get3DS();
            await braintreeSDKCreator.getDataCollector();
            await braintreeSDKCreator.getVisaCheckout();
            await braintreeSDKCreator.getVenmoCheckout(jest.fn(), jest.fn());

            await braintreeSDKCreator.teardown();

            expect(dataCollectorMock.teardown).toHaveBeenCalled();
            expect(threeDSecureMock.teardown).toHaveBeenCalled();
            expect(visaCheckoutMock.teardown).toHaveBeenCalled();
            expect(braintreeVenmoCheckout.teardown).toHaveBeenCalled();
        });

        it('only teardown instantiated dependencies', async () => {
            await braintreeSDKCreator.getDataCollector();

            await braintreeSDKCreator.teardown();

            expect(dataCollectorMock.teardown).toHaveBeenCalled();
            expect(threeDSecureMock.teardown).not.toHaveBeenCalled();
            expect(visaCheckoutMock.teardown).not.toHaveBeenCalled();
        });
    });
});
