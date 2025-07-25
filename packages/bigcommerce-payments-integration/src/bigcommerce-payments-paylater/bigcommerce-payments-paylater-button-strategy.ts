import {
    BigCommercePaymentsInitializationData,
    getPaypalMessagesStylesFromBNPLConfig,
    MessagingOptions,
    PayPalBNPLConfigurationItem,
    PayPalMessagesSdk,
    PayPalSdkHelper,
} from '@bigcommerce/checkout-sdk/bigcommerce-payments-utils';
import {
    CheckoutButtonInitializeOptions,
    CheckoutButtonStrategy,
    InvalidArgumentError,
    MissingDataError,
    MissingDataErrorType,
    PaymentIntegrationService,
} from '@bigcommerce/checkout-sdk/payment-integration-api';

import BigCommercePaymentsIntegrationService from '../bigcommerce-payments-integration-service';
import {
    ApproveCallbackActions,
    ApproveCallbackPayload,
    BigCommercePaymentsButtonsOptions,
    PayPalBuyNowInitializeOptions,
    ShippingAddressChangeCallbackPayload,
    ShippingOptionChangeCallbackPayload,
} from '../bigcommerce-payments-types';

import BigCommercePaymentsPayLaterButtonInitializeOptions, {
    WithBigCommercePaymentsPayLaterButtonInitializeOptions,
} from './bigcommerce-payments-paylater-button-initialize-options';

export default class BigCommercePaymentsPayLaterButtonStrategy implements CheckoutButtonStrategy {
    constructor(
        private paymentIntegrationService: PaymentIntegrationService,
        private bigCommercePaymentsIntegrationService: BigCommercePaymentsIntegrationService,
        private payPalSdkHelper: PayPalSdkHelper,
    ) {}

    async initialize(
        options: CheckoutButtonInitializeOptions &
            WithBigCommercePaymentsPayLaterButtonInitializeOptions,
    ): Promise<void> {
        const { bigcommerce_payments_paylater, containerId, methodId } = options;
        const {
            buyNowInitializeOptions,
            currencyCode: providedCurrencyCode,
            messagingContainerId,
        } = bigcommerce_payments_paylater || {};

        const isBuyNowFlow = !!buyNowInitializeOptions;

        if (!methodId) {
            throw new InvalidArgumentError(
                'Unable to initialize payment because "options.methodId" argument is not provided.',
            );
        }

        if (!containerId) {
            throw new InvalidArgumentError(
                `Unable to initialize payment because "options.containerId" argument is not provided.`,
            );
        }

        if (!bigcommerce_payments_paylater) {
            throw new InvalidArgumentError(
                `Unable to initialize payment because "options.bigcommerce_payments_paylater" argument is not provided.`,
            );
        }

        if (isBuyNowFlow && !providedCurrencyCode) {
            throw new InvalidArgumentError(
                `Unable to initialize payment because "options.bigcommerce_payments_paylater.currencyCode" argument is not provided.`,
            );
        }

        if (
            isBuyNowFlow &&
            typeof buyNowInitializeOptions?.getBuyNowCartRequestBody !== 'function'
        ) {
            throw new InvalidArgumentError(
                `Unable to initialize payment because "options.bigcommerce_payments_paylater.buyNowInitializeOptions.getBuyNowCartRequestBody" argument is not provided or it is not a function.`,
            );
        }

        if (!isBuyNowFlow) {
            // Info: default checkout should not be loaded for BuyNow flow,
            // since there is no checkout session available for that.
            await this.paymentIntegrationService.loadDefaultCheckout();
        }

        const state = this.paymentIntegrationService.getState();

        // Info: we are using provided currency code for buy now cart,
        // because checkout session is not available before buy now cart creation,
        // hence application will throw an error on getCartOrThrow method call
        const currencyCode = isBuyNowFlow
            ? providedCurrencyCode
            : state.getCartOrThrow().currency.code;

        await this.bigCommercePaymentsIntegrationService.loadPayPalSdk(
            methodId,
            currencyCode,
            false,
        );

        this.renderButton(containerId, methodId, bigcommerce_payments_paylater);

        const messagingContainer =
            messagingContainerId && document.getElementById(messagingContainerId);

        if (currencyCode && messagingContainer) {
            const paymentMethod =
                state.getPaymentMethodOrThrow<BigCommercePaymentsInitializationData>(methodId);

            const { paypalBNPLConfiguration = [] } = paymentMethod.initializationData || {};
            const bannerConfiguration =
                paypalBNPLConfiguration && paypalBNPLConfiguration.find(({ id }) => id === 'cart');

            if (!bannerConfiguration?.status) {
                return;
            }

            // TODO: remove this when data attributes will be removed from related cart banner container in content service
            messagingContainer.removeAttribute('data-pp-style-logo-type');
            messagingContainer.removeAttribute('data-pp-style-logo-position');
            messagingContainer.removeAttribute('data-pp-style-text-color');
            messagingContainer.removeAttribute('data-pp-style-text-size');

            const payPalSdkHelper = await this.payPalSdkHelper.getPayPalMessages(
                paymentMethod,
                currencyCode,
            );

            this.renderMessages(payPalSdkHelper, messagingContainerId, bannerConfiguration);
        }
    }

    deinitialize(): Promise<void> {
        return Promise.resolve();
    }

    private renderButton(
        containerId: string,
        methodId: string,
        bigcommerce_payments_paylater: BigCommercePaymentsPayLaterButtonInitializeOptions,
    ): void {
        const { buyNowInitializeOptions, style, onComplete, onEligibilityFailure } =
            bigcommerce_payments_paylater;

        const bigCommercePaymentsSdk =
            this.bigCommercePaymentsIntegrationService.getPayPalSdkOrThrow();
        const state = this.paymentIntegrationService.getState();
        const paymentMethod =
            state.getPaymentMethodOrThrow<BigCommercePaymentsInitializationData>(methodId);
        const { isHostedCheckoutEnabled } = paymentMethod.initializationData || {};

        const defaultCallbacks = {
            createOrder: () =>
                this.bigCommercePaymentsIntegrationService.createOrder(
                    'bigcommerce_payments_paylater',
                ),
            onApprove: ({ orderID }: ApproveCallbackPayload) =>
                this.bigCommercePaymentsIntegrationService.tokenizePayment(methodId, orderID),
        };

        const buyNowFlowCallbacks = {
            onClick: () => this.handleClick(buyNowInitializeOptions),
            onCancel: () => this.paymentIntegrationService.loadDefaultCheckout(),
        };

        const hostedCheckoutCallbacks = {
            onShippingAddressChange: (data: ShippingAddressChangeCallbackPayload) =>
                this.onShippingAddressChange(data),
            onShippingOptionsChange: (data: ShippingOptionChangeCallbackPayload) =>
                this.onShippingOptionsChange(data),
            onApprove: (data: ApproveCallbackPayload, actions: ApproveCallbackActions) =>
                this.onHostedCheckoutApprove(data, actions, methodId, onComplete),
        };

        const fundingSources = [
            bigCommercePaymentsSdk.FUNDING.PAYLATER,
            bigCommercePaymentsSdk.FUNDING.CREDIT,
        ];
        let hasRenderedSmartButton = false;

        fundingSources.forEach((fundingSource) => {
            if (!hasRenderedSmartButton) {
                const buttonRenderOptions: BigCommercePaymentsButtonsOptions = {
                    fundingSource,
                    style: this.bigCommercePaymentsIntegrationService.getValidButtonStyle(style),
                    ...defaultCallbacks,
                    ...(buyNowInitializeOptions && buyNowFlowCallbacks),
                    ...(isHostedCheckoutEnabled && hostedCheckoutCallbacks),
                };

                const paypalButton = bigCommercePaymentsSdk.Buttons(buttonRenderOptions);

                if (paypalButton.isEligible()) {
                    paypalButton.render(`#${containerId}`);
                    hasRenderedSmartButton = true;
                } else if (onEligibilityFailure && typeof onEligibilityFailure === 'function') {
                    onEligibilityFailure();
                }
            }
        });

        if (!hasRenderedSmartButton) {
            this.bigCommercePaymentsIntegrationService.removeElement(containerId);
        }
    }

    private async handleClick(
        buyNowInitializeOptions?: PayPalBuyNowInitializeOptions,
    ): Promise<void> {
        if (buyNowInitializeOptions) {
            const buyNowCart =
                await this.bigCommercePaymentsIntegrationService.createBuyNowCartOrThrow(
                    buyNowInitializeOptions,
                );

            await this.paymentIntegrationService.loadCheckout(buyNowCart.id);
        }
    }

    private async onHostedCheckoutApprove(
        data: ApproveCallbackPayload,
        actions: ApproveCallbackActions,
        methodId: string,
        onComplete?: () => void,
    ): Promise<boolean> {
        if (!data.orderID) {
            throw new MissingDataError(MissingDataErrorType.MissingOrderId);
        }

        const state = this.paymentIntegrationService.getState();
        const cart = state.getCartOrThrow();
        const orderDetails = await actions.order.get();

        try {
            const billingAddress =
                this.bigCommercePaymentsIntegrationService.getBillingAddressFromOrderDetails(
                    orderDetails,
                );

            await this.paymentIntegrationService.updateBillingAddress(billingAddress);

            if (cart.lineItems.physicalItems.length > 0) {
                const shippingAddress =
                    this.bigCommercePaymentsIntegrationService.getShippingAddressFromOrderDetails(
                        orderDetails,
                    );

                await this.paymentIntegrationService.updateShippingAddress(shippingAddress);
                await this.bigCommercePaymentsIntegrationService.updateOrder();
            }

            await this.paymentIntegrationService.submitOrder({}, { params: { methodId } });
            await this.bigCommercePaymentsIntegrationService.submitPayment(methodId, data.orderID);

            if (onComplete && typeof onComplete === 'function') {
                onComplete();
            }

            return true; // FIXME: Do we really need to return true here?
        } catch (error) {
            if (typeof error === 'string') {
                throw new Error(error);
            }

            throw error;
        }
    }

    private async onShippingAddressChange(
        data: ShippingAddressChangeCallbackPayload,
    ): Promise<void> {
        const address = this.bigCommercePaymentsIntegrationService.getAddress({
            city: data.shippingAddress.city,
            countryCode: data.shippingAddress.countryCode,
            postalCode: data.shippingAddress.postalCode,
            stateOrProvinceCode: data.shippingAddress.state,
        });

        try {
            // Info: we use the same address to fill billing and shipping addresses to have valid quota on BE for order updating process
            // on this stage we don't have access to valid customer's address accept shipping data
            await this.paymentIntegrationService.updateBillingAddress(address);
            await this.paymentIntegrationService.updateShippingAddress(address);

            const shippingOption =
                this.bigCommercePaymentsIntegrationService.getShippingOptionOrThrow();

            await this.paymentIntegrationService.selectShippingOption(shippingOption.id);
            await this.bigCommercePaymentsIntegrationService.updateOrder();
        } catch (error) {
            if (typeof error === 'string') {
                throw new Error(error);
            }

            throw error;
        }
    }

    private async onShippingOptionsChange(
        data: ShippingOptionChangeCallbackPayload,
    ): Promise<void> {
        const shippingOption = this.bigCommercePaymentsIntegrationService.getShippingOptionOrThrow(
            data.selectedShippingOption.id,
        );

        try {
            await this.paymentIntegrationService.selectShippingOption(shippingOption.id);
            await this.bigCommercePaymentsIntegrationService.updateOrder();
        } catch (error) {
            if (typeof error === 'string') {
                throw new Error(error);
            }

            throw error;
        }
    }

    private renderMessages(
        paypalMessagesSdk: PayPalMessagesSdk,
        messagingContainerId: string,
        bannerConfiguration: PayPalBNPLConfigurationItem,
    ): void {
        const checkout = this.paymentIntegrationService.getState().getCheckoutOrThrow();

        const paypalMessagesOptions: MessagingOptions = {
            amount: checkout.outstandingBalance,
            placement: 'cart',
            style: getPaypalMessagesStylesFromBNPLConfig(bannerConfiguration),
        };

        const paypalMessages = paypalMessagesSdk.Messages(paypalMessagesOptions);

        paypalMessages.render(`#${messagingContainerId}`);
    }
}
