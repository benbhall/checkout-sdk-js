import { createFormPoster } from '@bigcommerce/form-poster';
import { createRequestSender } from '@bigcommerce/request-sender';
import { getScriptLoader } from '@bigcommerce/script-loader';

import {
    CheckoutButtonStrategyFactory,
    toResolvableModule,
} from '@bigcommerce/checkout-sdk/payment-integration-api';

import createGooglePayScriptLoader from '../factories/create-google-pay-script-loader';
import GooglePayButtonStrategy from '../google-pay-button-strategy';
import GooglePayPaymentProcessor from '../google-pay-payment-processor';

import GooglePayStripeGateway from './google-pay-stripe-gateway';
import StripeUPEScriptLoader from './stripe-upe-script-loader';

const createGooglePayStripeButtonStrategy: CheckoutButtonStrategyFactory<
    GooglePayButtonStrategy
> = (paymentIntegrationService) =>
    new GooglePayButtonStrategy(
        paymentIntegrationService,
        new GooglePayPaymentProcessor(
            createGooglePayScriptLoader(),
            new GooglePayStripeGateway(
                paymentIntegrationService,
                new StripeUPEScriptLoader(getScriptLoader()),
            ),
            createRequestSender(),
            createFormPoster(),
        ),
    );

export default toResolvableModule(createGooglePayStripeButtonStrategy, [
    { id: 'googlepaystripe' },
    { id: 'googlepaystripeupe' },
    { id: 'googlepaystripeocs' },
]);
