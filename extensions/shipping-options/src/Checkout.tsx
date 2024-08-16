import {
  reactExtension,
  Banner,
  BlockStack,
  InlineStack,
  Button,
  ChoiceList,
  Choice,
  Icon,
  Text,
  useApi,
  useApplyAttributeChange,
  useCartLines,
  useInstructions,
  useTranslate,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from 'react';
// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const { extension } = useApi();
  const cartItems = useCartLines();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();
  const [selectedOption, setSelectedOption] = useState<string>('standard');
  const [showExpressOption, setShowExpressOption] = useState(false);

  useEffect(() => {
    async function checkAvailability() {
      const skuIds = cartItems.map(item => item.merchandise.sku);
      console.log("Cart lines   --  ", skuIds);
      const payload = {
        transactionType: 'omsCreate',
        sellingChannel: 'DIGITAL',
        orgId: 'ALO',
        products: skuIds.map(skuId => ({
          uom: 'EACH',
          productId: skuId,
        })),
      };

      const response = await fetch('https://sandy.free.beeceptor.com/availability-services/availability/aggregator/v3.0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token', 
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Check if all items are eligible for express shipping
      const allItemsEligible = data.availabilityByProducts.every(product => 
        product.availabilityByFulfillmentTypes.some(fulfillment => 
          fulfillment.fulfillmentType === 'SHIP' &&
          fulfillment.availabilityDetails.some(detail =>
            detail.availabilityByLocations.some(location =>
              location.locationType === 'DC' &&
              location.locationId === 'AV' &&
              location.atp > 1
            )
          )
        )
      );

      setShowExpressOption(allItemsEligible);
    }

    if (cartItems.length > 0) {
      checkAvailability();
    }
  }, [cartItems]);

  if (!instructions.attributes.canUpdateAttributes) {
    return (
      <Banner title="test-store-shipping-options" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  const handleOptionChange = (value: string | string[]) => {
    setSelectedOption(Array.isArray(value) ? value[0] : value);
    console.log(`Selected shipping option: ${value}`);
  };

  async function onApplyShippingOption() {
    const result = await applyAttributeChange({
      key: "selectedShippingOption",
      type: "updateAttribute",
      value: selectedOption,
    });
    console.log("applyAttributeChange result", result);
  }

  return (
    <BlockStack spacing="loose" border="dotted" padding="base">
      <Banner title="test-store-shipping-options">
        {translate("welcome", {
          target: <Text emphasis="italic">{extension.target}</Text>,
        })}
      </Banner>
      <BlockStack spacing="tight">
        <Text>Please select your preferred shipping method:</Text>
        <ChoiceList
          name="shipping-option"
          value={selectedOption}
          onChange={handleOptionChange}
          variant="group"
        >
          <Choice
            id="standard"
            secondaryContent={<Icon source="truck" />}
          >
            Standard Shipping (3-5 business days)
          </Choice>
          {showExpressOption && (
            <Choice
              id="express"
              secondaryContent={<Icon source="delivery" />}
            >
              Express Shipping (1-2 business days)
            </Choice>
          )}
          <Choice
            id="pickup"
            secondaryContent={<Icon source="store" />}
          >
            In-store Pickup
          </Choice>
        </ChoiceList>
      </BlockStack>
      <InlineStack blockAlignment="center">
        <Button onPress={onApplyShippingOption}>
          Apply Shipping Option
        </Button>
      </InlineStack>
    </BlockStack>
  );
}