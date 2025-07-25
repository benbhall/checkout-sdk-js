export default interface StripeOCSCustomerInitializeOptions {
    buttonHeight?: number;

    /**
     * The ID of a container which the stripe iframe should be inserted.
     */
    container: string;

    /**
     * The identifier of the payment method.
     */
    methodId: string;

    gatewayId: string;

    onComplete?: (orderId?: number) => Promise<never>;

    loadingContainerId?: string;
}

export interface WithStripeOCSCustomerInitializeOptions {
    stripeocs?: StripeOCSCustomerInitializeOptions;
}
