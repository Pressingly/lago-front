import styled from 'styled-components'

import { Accordion, Typography } from '~/components/designSystem'
import { intlFormatNumber } from '~/core/formats/intlFormatNumber'
import { deserializeAmount } from '~/core/serializers/serializeAmount'
import {
  Charge,
  ChargeGroup,
  ChargeModelEnum,
  CurrencyEnum,
  EditPlanFragment,
  PlanInterval,
} from '~/generated/graphql'
import { useInternationalization } from '~/hooks/core/useInternationalization'
import { theme } from '~/styles'
import { DetailsInfoGrid, DetailsInfoItem } from '~/styles/detailsPage'

import PlanDetailsChargeGroupSectionAccordion from './PlanDetailsChargeGroupSectionAccordion'
import PlanDetailsChargesSectionAccordion from './PlanDetailsChargesSectionAccordion'

import { mapChargeIntervalCopy } from '../ChargeAccordion'

const chargeModelLookupTranslation = {
  [ChargeModelEnum.Graduated]: 'text_65201b8216455901fe273e11',
  [ChargeModelEnum.GraduatedPercentage]: 'text_65201b8216455901fe273e32',
  [ChargeModelEnum.Package]: 'text_65201b8216455901fe273de5',
  [ChargeModelEnum.PackageGroup]: 'Package Group',
  [ChargeModelEnum.Percentage]: 'text_65201b8216455901fe273df8',
  [ChargeModelEnum.Standard]: 'text_65201b8216455901fe273dd6',
  [ChargeModelEnum.Volume]: 'text_65201b8216455901fe273e4f',
  [ChargeModelEnum.Timebased]: 'Time-based',
}

const PlanDetailsChargesSection = ({
  currency,
  plan,
}: {
  currency: CurrencyEnum
  plan?: EditPlanFragment | null
}) => {
  const { translate } = useInternationalization()
  const { meteredCharges, recurringCharges, groupChargeMaps } =
    plan?.charges?.reduce(
      (acc, charge) => {
        if (!!charge.chargeGroup) {
          const groupId = charge.chargeGroup.id

          acc.groupChargeMaps.set(groupId, [...(acc.groupChargeMaps.get(groupId) || []), charge])
        } else if (!charge.billableMetric.recurring) {
          acc?.meteredCharges?.push(charge)
        } else {
          acc?.recurringCharges?.push(charge)
        }
        return acc
      },
      { meteredCharges: [], recurringCharges: [], groupChargeMaps: new Map() } as {
        meteredCharges: EditPlanFragment['charges']
        recurringCharges: EditPlanFragment['charges']
        groupChargeMaps: Map<string, EditPlanFragment['charges']>
      },
    ) ?? {}

  return (
    <Container>
      {!!meteredCharges?.length && (
        <ChargeSectionWrapper>
          <div>
            <Typography variant="bodyHl" color="grey700">
              {translate('text_64d2713ec021c6005ef64e03')}
            </Typography>
            <Typography variant="caption" color="grey600">
              {translate('text_64d2715f868d50004c21fee8')}
            </Typography>
          </div>
          {meteredCharges.map((charge, i) => (
            <Accordion
              noContentMargin
              key={`plan-details_charges-section_metered-charge-${i}`}
              summary={
                <ChargeSummaryWrapper>
                  <Typography variant="bodyHl" color="grey700">
                    {charge.invoiceDisplayName || charge.billableMetric.name}
                  </Typography>
                  <Typography variant="caption" noWrap>
                    {charge.billableMetric.code}
                  </Typography>
                </ChargeSummaryWrapper>
              }
            >
              <ChargeSectionWrapper>
                {/* Charge main infos */}
                <PaddedChargeModelWrapper>
                  <DetailsInfoGrid>
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dd5')}
                      value={translate(chargeModelLookupTranslation[charge.chargeModel])}
                    />
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dc1')}
                      value={translate(
                        mapChargeIntervalCopy(
                          plan?.interval as PlanInterval,
                          (plan?.interval === PlanInterval.Yearly && !!plan?.billChargesMonthly) ||
                            false,
                        ),
                      )}
                    />
                  </DetailsInfoGrid>
                </PaddedChargeModelWrapper>
                {/* Propertiers accordion */}
                <PlanDetailsChargesSectionAccordion currency={currency} charge={charge as Charge} />
                {/* Options */}
                <PaddedOptionsWrapper>
                  <DetailsInfoGrid>
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dd9')}
                      value={
                        charge?.payInAdvance
                          ? translate('text_646e2d0cc536351b62ba6faa')
                          : translate('text_646e2d0cc536351b62ba6f8c')
                      }
                    />
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273ddb')}
                      value={intlFormatNumber(deserializeAmount(charge.minAmountCents, currency), {
                        currencyDisplay: 'symbol',
                        currency,
                        maximumFractionDigits: 15,
                      })}
                    />
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273df0')}
                      value={
                        charge.prorated
                          ? translate('text_65251f46339c650084ce0d57')
                          : translate('text_65251f4cd55aeb004e5aa5ef')
                      }
                    />
                    <DetailsInfoItem
                      label={translate('text_646e2d0cc536351b62ba6f16')}
                      value={
                        charge.invoiceable
                          ? translate('text_65251f46339c650084ce0d57')
                          : translate('text_65251f4cd55aeb004e5aa5ef')
                      }
                    />
                    <DetailsInfoItem
                      label={translate('text_645bb193927b375079d28a8f')}
                      value={
                        !!charge?.taxes?.length || !!plan?.taxes?.length
                          ? (charge.taxes?.length ? charge.taxes : plan?.taxes)?.map(
                              (tax, taxIndex) => (
                                <div
                                  key={`plan-details-charge-${i}-section-accordion-tax-${taxIndex}`}
                                >
                                  {tax.name} (
                                  {intlFormatNumber(Number(tax.rate) / 100 || 0, {
                                    maximumFractionDigits: 2,
                                    style: 'percent',
                                  })}
                                  )
                                </div>
                              ),
                            )
                          : '-'
                      }
                    />
                  </DetailsInfoGrid>
                </PaddedOptionsWrapper>
              </ChargeSectionWrapper>
            </Accordion>
          ))}
        </ChargeSectionWrapper>
      )}
      {!!recurringCharges?.length && (
        <ChargeSectionWrapper>
          <div>
            <Typography variant="bodyHl" color="grey700">
              {translate('text_64d271e20a9c11005bd6688a')}
            </Typography>
            <Typography variant="caption" color="grey600">
              {translate('text_64d2720f666bf7007e9ca759')}
            </Typography>
          </div>
          {recurringCharges.map((charge, i) => (
            <Accordion
              noContentMargin
              key={`plan-details_charges-section_recurring-charge-${i}`}
              summary={
                <Typography variant="bodyHl" color="grey700">
                  <ChargeSummaryWrapper>
                    {charge.invoiceDisplayName || charge.billableMetric.name}
                  </ChargeSummaryWrapper>
                  <Typography variant="caption" noWrap>
                    {charge.billableMetric.code}
                  </Typography>
                </Typography>
              }
            >
              <ChargeSectionWrapper>
                {/* Charge main infos */}
                <PaddedChargeModelWrapper>
                  <DetailsInfoGrid>
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dd5')}
                      value={translate(chargeModelLookupTranslation[charge.chargeModel])}
                    />
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dc1')}
                      value={translate(
                        mapChargeIntervalCopy(
                          plan?.interval as PlanInterval,
                          (plan?.interval === PlanInterval.Yearly && !!plan?.billChargesMonthly) ||
                            false,
                        ),
                      )}
                    />
                  </DetailsInfoGrid>
                </PaddedChargeModelWrapper>
                {/* Propertiers accordion */}
                <PlanDetailsChargesSectionAccordion currency={currency} charge={charge as Charge} />
                {/* Options */}
                <PaddedOptionsWrapper>
                  <DetailsInfoGrid>
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dd9')}
                      value={
                        charge?.payInAdvance
                          ? translate('text_646e2d0cc536351b62ba6faa')
                          : translate('text_646e2d0cc536351b62ba6f8c')
                      }
                    />
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273ddb')}
                      value={intlFormatNumber(deserializeAmount(charge.minAmountCents, currency), {
                        currencyDisplay: 'symbol',
                        currency,
                        maximumFractionDigits: 15,
                      })}
                    />
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273df0')}
                      value={
                        charge.prorated
                          ? translate('text_65251f46339c650084ce0d57')
                          : translate('text_65251f4cd55aeb004e5aa5ef')
                      }
                    />
                    <DetailsInfoItem
                      label={translate('text_646e2d0cc536351b62ba6f16')}
                      value={
                        charge.invoiceable
                          ? translate('text_65251f46339c650084ce0d57')
                          : translate('text_65251f4cd55aeb004e5aa5ef')
                      }
                    />
                    <DetailsInfoItem
                      label={translate('text_645bb193927b375079d28a8f')}
                      value={
                        !!charge?.taxes?.length || !!plan?.taxes?.length
                          ? (charge.taxes?.length ? charge.taxes : plan?.taxes)?.map(
                              (tax, taxIndex) => (
                                <div
                                  key={`plan-details-charge-${i}-section-accordion-tax-${taxIndex}`}
                                >
                                  {tax.name} (
                                  {intlFormatNumber(Number(tax.rate) / 100 || 0, {
                                    maximumFractionDigits: 2,
                                    style: 'percent',
                                  })}
                                  )
                                </div>
                              ),
                            )
                          : '-'
                      }
                    />
                  </DetailsInfoGrid>
                </PaddedOptionsWrapper>
              </ChargeSectionWrapper>
            </Accordion>
          ))}
        </ChargeSectionWrapper>
      )}
      {!!groupChargeMaps && groupChargeMaps.size > 0 && (
        <ChargeSectionWrapper>
          <div>
            <Typography variant="bodyHl" color="grey700">
              {translate('Group charges')}
            </Typography>
            <Typography variant="caption" color="grey600">
              {translate('Charges are grouped together and billed as a single line item.')}
            </Typography>
          </div>
          {Array.from(groupChargeMaps).map(([, chargesArray], groupIndex) => (
            <Accordion
              noContentMargin
              key={`plan-details_charges-section_group-charge-${groupIndex}`}
              summary={
                <Typography variant="bodyHl" color="grey700">
                  <ChargeSummaryWrapper>
                    {chargesArray?.[0]?.chargeGroup?.invoiceDisplayName ||
                      'Group of ' + chargesArray?.[0].billableMetric.name}
                  </ChargeSummaryWrapper>
                </Typography>
              }
            >
              <ChargeSectionWrapper>
                <PaddedChargeModelWrapper>
                  <DetailsInfoGrid>
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dd5')}
                      value={translate(chargeModelLookupTranslation[ChargeModelEnum.PackageGroup])}
                    />
                    <DetailsInfoItem
                      label={translate('text_65201b8216455901fe273dc1')}
                      value={translate(
                        mapChargeIntervalCopy(
                          plan?.interval as PlanInterval,
                          (plan?.interval === PlanInterval.Yearly && !!plan?.billChargesMonthly) ||
                            false,
                        ),
                      )}
                    />
                  </DetailsInfoGrid>
                </PaddedChargeModelWrapper>
                <ChargeSectionWrapper>
                  <PlanDetailsChargeGroupSectionAccordion
                    currency={currency}
                    chargesArray={chargesArray as Charge[]}
                    chargeGroup={chargesArray?.[0]?.chargeGroup as ChargeGroup}
                  />
                </ChargeSectionWrapper>
              </ChargeSectionWrapper>
            </Accordion>
          ))}
        </ChargeSectionWrapper>
      )}
    </Container>
  )
}

export default PlanDetailsChargesSection

const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing(12)};
`

const ChargeSectionWrapper = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing(4)};
`

const PaddedChargeModelWrapper = styled.div`
  padding: ${theme.spacing(4)} ${theme.spacing(4)} 0;
`

const ChargeSummaryWrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const PaddedOptionsWrapper = styled.div`
  padding: 0 ${theme.spacing(4)} ${theme.spacing(4)};
  box-sizing: border-box;
`
