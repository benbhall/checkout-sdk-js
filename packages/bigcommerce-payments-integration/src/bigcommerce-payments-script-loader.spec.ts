import { createScriptLoader, ScriptLoader } from '@bigcommerce/script-loader';

import {
    MissingDataError,
    PaymentMethod,
    PaymentMethodClientUnavailableError,
} from '@bigcommerce/checkout-sdk/payment-integration-api';

import BigCommercePaymentsScriptLoader from './bigcommerce-payments-script-loader';
import { BigCommercePaymentsHostWindow, PayPalSDK } from './bigcommerce-payments-types';
import { getBigCommercePaymentsPaymentMethod, getPayPalSDKMock } from './mocks';

describe('BigCommercePaymentsScriptLoader', () => {
    let loader: ScriptLoader;
    let paypalLoader: BigCommercePaymentsScriptLoader;
    let paypalSdk: PayPalSDK;
    let paymentMethod: PaymentMethod;

    beforeEach(() => {
        loader = createScriptLoader();
        paymentMethod = getBigCommercePaymentsPaymentMethod();
        paypalSdk = getPayPalSDKMock();

        jest.spyOn(loader, 'loadScript').mockImplementation(() => {
            (window as BigCommercePaymentsHostWindow).paypal = paypalSdk;

            return Promise.resolve();
        });

        paypalLoader = new BigCommercePaymentsScriptLoader(loader);
    });

    afterEach(() => {
        (window as BigCommercePaymentsHostWindow).paypal = undefined;
    });

    it('throws an error if initializationData is missing', async () => {
        const paymentMethodProp = {
            ...paymentMethod,
            initializationData: undefined,
        };

        try {
            await paypalLoader.getPayPalSDK(paymentMethodProp, 'USD');
        } catch (error) {
            expect(error).toBeInstanceOf(MissingDataError);
        }
    });

    it('loads PayPalSDK with default configuration', async () => {
        const output = await paypalLoader.getPayPalSDK(paymentMethod, 'USD');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
        expect(output).toEqual(paypalSdk);
    });

    it('loads PayPalSDK script every time if force load flag is provided', async () => {
        const bigCommercePaymentsCreditPaymentMethod = {
            ...paymentMethod,
            id: 'bigcommerce_payments_creditcards',
        };

        await paypalLoader.getPayPalSDK(paymentMethod, 'USD');
        await paypalLoader.getPayPalSDK(bigCommercePaymentsCreditPaymentMethod, 'USD', false, true);

        expect(loader.loadScript).toHaveBeenCalledTimes(2);
    });

    it('loads PayPalSDK script with EUR currency', async () => {
        await paypalLoader.getPayPalSDK(paymentMethod, 'EUR');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=EUR&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads BigCommercePayments script with disabled card funding', async () => {
        await paypalLoader.getPayPalSDK(paymentMethod, 'USD');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads BigCommercePayments script with enabled credit funding', async () => {
        const paymentMethodProp = {
            ...paymentMethod,
            initializationData: {
                ...paymentMethod.initializationData,
                isPayPalCreditAvailable: true,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodProp, 'USD');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&enable-funding=credit%2Cpaylater&disable-funding=card%2Cvenmo&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads BigCommercePayments script with disabled credit funding', async () => {
        const paymentMethodProp = {
            ...paymentMethod,
            initializationData: {
                ...paymentMethod.initializationData,
                isPayPalCreditAvailable: false,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodProp, 'USD');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads BigCommercePayments script with enabled Venmo funding', async () => {
        const paymentMethodProp = {
            ...paymentMethod,
            initializationData: {
                ...paymentMethod.initializationData,
                isVenmoEnabled: true,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodProp, 'USD');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&enable-funding=venmo&disable-funding=card%2Ccredit%2Cpaylater&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads BigCommercePayments script with disabled Venmo funding', async () => {
        const paymentMethodProp = {
            ...paymentMethod,
            initializationData: {
                ...paymentMethod.initializationData,
                isVenmoEnabled: false,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodProp, 'USD');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads BigCommercePayments script with enabled several APMs', async () => {
        const paymentMethodProp = {
            ...paymentMethod,
            initializationData: {
                ...paymentMethod.initializationData,
                availableAlternativePaymentMethods: [
                    'bancontact',
                    'giropay',
                    'ideal',
                    'mybank',
                    'sofort',
                    'sepa',
                ],
                enabledAlternativePaymentMethods: ['bancontact', 'giropay', 'ideal'],
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodProp, 'USD');

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&enable-funding=bancontact%2Cgiropay%2Cideal&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo%2Cmybank%2Csofort%2Csepa&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads PayPalSDK script with disabled all APMs', async () => {
        const paymentMethodProp = {
            ...paymentMethod,
            initializationData: {
                ...paymentMethod.initializationData,
                availableAlternativePaymentMethods: [
                    'bancontact',
                    'giropay',
                    'ideal',
                    'mybank',
                    'sofort',
                    'sepa',
                ],
                enabledAlternativePaymentMethods: ['bancontact', 'giropay', 'ideal'],
                isHostedCheckoutEnabled: true,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodProp, 'USD', false);

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo%2Cbancontact%2Cgiropay%2Cideal%2Cmybank%2Csofort%2Csepa&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads PayPalSDK script with commit flag as true', async () => {
        await paypalLoader.getPayPalSDK(paymentMethod, 'USD', true);

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=true&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal%2Ccard-fields&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('loads PayPalSDK script with commit flag as false', async () => {
        await paypalLoader.getPayPalSDK(paymentMethod, 'USD', false);

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=false&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('successfully loads PayPalSDK script with commit flag as false if Skip Checkout feature off', async () => {
        const paymentMethodMock = {
            ...paymentMethod,
            initializationData: {
                ...paymentMethod.initializationData,
                isHostedFormEnabled: false,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodMock, 'USD', false);

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=false&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('successfully enables all provided funding sources', async () => {
        const paymentMethodMock = {
            ...paymentMethod,
            id: 'bigcommerce_payments_creditcards',
            initializationData: {
                ...paymentMethod.initializationData,
                isHostedCheckoutEnabled: false,
                isVenmoEnabled: true,
                isPayPalCreditAvailable: true,
                availableAlternativePaymentMethods: [],
                enabledAlternativePaymentMethods: [],
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodMock, 'USD', false);

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&enable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=false&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal&currency=USD&intent=capture';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('successfully loads paypal sdk with dev configuration', async () => {
        const paymentMethodMock = {
            ...paymentMethod,
            id: 'bigcommerce_payments',
            initializationData: {
                ...paymentMethod.initializationData,
                buyerCountry: 'UA',
                isDeveloperModeApplicable: true,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodMock, 'USD', false);

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&merchant-id=JTS4DY7XFSQZE&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=false&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal&currency=USD&intent=capture&buyer-country=UA';
        const paypalSdkAttributes = {
            'data-client-token': paymentMethod.clientToken,
            'data-partner-attribution-id': paymentMethod.initializationData.attributionId,
        };

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('successfully loads paypal sdk without nil values in configuration', async () => {
        const paymentMethodMock = {
            ...paymentMethod,
            clientToken: '',
            id: 'bigcommerce_payments',
            initializationData: {
                ...paymentMethod.initializationData,
                attributionId: '',
                merchantId: null,
            },
        };

        await paypalLoader.getPayPalSDK(paymentMethodMock, 'USD', false);

        const paypalSdkScriptSrc =
            'https://www.paypal.com/sdk/js?client-id=abc&disable-funding=card%2Ccredit%2Cpaylater%2Cvenmo&commit=false&components=buttons%2Chosted-fields%2Cpayment-fields%2Clegal&currency=USD&intent=capture';
        const paypalSdkAttributes = {};

        expect(loader.loadScript).toHaveBeenCalledWith(paypalSdkScriptSrc, {
            async: true,
            attributes: paypalSdkAttributes,
        });
    });

    it('throw error if unable to load Paypal script', async () => {
        const expectedError = new PaymentMethodClientUnavailableError();

        jest.spyOn(loader, 'loadScript').mockImplementation(() => {
            throw expectedError;
        });

        try {
            await paypalLoader.getPayPalSDK(paymentMethod, 'USD');
        } catch (error) {
            expect(error).toEqual(expectedError);
        }
    });
});
