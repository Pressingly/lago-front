import { useMemo } from 'react'
import { gql, ApolloError } from '@apollo/client'
import { generatePath, useNavigate, useParams } from 'react-router-dom'
import _groupBy from 'lodash/groupBy'

import {
  useGetInvoiceCreateCreditNoteQuery,
  LagoApiError,
  InvoiceCreateCreditNoteFragment,
  FeeTypesEnum,
  useCreateCreditNoteMutation,
  InvoiceFeeFragment,
  CreateCreditNoteInvoiceFragmentDoc,
} from '~/generated/graphql'
import { ERROR_404_ROUTE, CUSTOMER_INVOICE_OVERVIEW_ROUTE } from '~/core/router'
import { hasDefinedGQLError, addToast } from '~/core/apolloClient'
import { FeesPerInvoice, CreditNoteForm } from '~/components/creditNote/types'
import { serializeCreditNoteInput } from '~/core/serializers'

gql`
  fragment InvoiceFee on Fee {
    id
    feeType
    vatRate
    creditableAmountCents
    charge {
      id
      billableMetric {
        id
        name
      }
    }
    group {
      key
      value
    }
  }

  fragment InvoiceCreateCreditNote on Invoice {
    id
    refundableAmountCents
    creditableAmountCents
    invoiceSubscriptions {
      subscription {
        id
        name
        plan {
          id
          name
        }
      }
      fees {
        ...InvoiceFee
      }
    }
    ...CreateCreditNoteInvoice
  }

  query getInvoiceCreateCreditNote($id: ID!) {
    invoice(id: $id) {
      ...InvoiceCreateCreditNote
    }
  }

  mutation createCreditNote($input: CreateCreditNoteInput!) {
    createCreditNote(input: $input) {
      id
    }
  }

  ${CreateCreditNoteInvoiceFragmentDoc}
`

type UseCreateCreditNoteReturn = {
  loading: boolean
  invoice?: InvoiceCreateCreditNoteFragment
  feesPerInvoice?: FeesPerInvoice
  onCreate: (
    value: CreditNoteForm
  ) => Promise<{ data?: { createCreditNote?: { id?: string } }; errors?: ApolloError }>
}

export const useCreateCreditNote: () => UseCreateCreditNoteReturn = () => {
  const { invoiceId, id } = useParams()
  const navigate = useNavigate()
  const { data, error, loading } = useGetInvoiceCreateCreditNoteQuery({
    fetchPolicy: 'network-only',
    context: { silentError: LagoApiError.NotFound },
    variables: {
      id: invoiceId as string,
    },
    skip: !invoiceId,
  })
  const [create] = useCreateCreditNoteMutation({
    context: {},
    onCompleted({ createCreditNote }) {
      if (!!createCreditNote) {
        addToast({
          severity: 'success',
          translateKey: 'text_63763e61409e0d55b268a590',
        })

        navigate(generatePath(CUSTOMER_INVOICE_OVERVIEW_ROUTE, { invoiceId, id }))
      }
    },
  })

  if (
    !invoiceId ||
    hasDefinedGQLError('NotFound', error, 'invoice') ||
    (data?.invoice?.refundableAmountCents === 0 && data?.invoice?.creditableAmountCents === 0)
  ) {
    navigate(ERROR_404_ROUTE)
  }

  const feesPerInvoice = useMemo(() => {
    return data?.invoice?.invoiceSubscriptions?.reduce<FeesPerInvoice>(
      (subAcc, invoiceSubscription) => {
        const groupedFees = _groupBy(invoiceSubscription?.fees, 'charge.id') as {
          [key: string]: InvoiceFeeFragment[]
        }
        const subscriptionName =
          invoiceSubscription?.subscription?.name || invoiceSubscription?.subscription?.plan?.name

        return {
          ...subAcc,
          [invoiceSubscription?.subscription?.id]: {
            subscriptionName,
            fees: Object.keys(groupedFees).reduce((groupApp, groupKey, index) => {
              if (groupKey === 'undefined') {
                const fee = groupedFees[groupKey][0]

                if (fee?.creditableAmountCents > 0) {
                  return {
                    [`0_${fee?.id}`]: {
                      id: fee?.id,
                      checked: true,
                      value: fee?.creditableAmountCents / 100,
                      name: subscriptionName,
                      maxAmount: fee?.creditableAmountCents,
                      vatRate: fee?.vatRate,
                    },
                    ...groupApp,
                  }
                }

                return groupApp
              }
              const feeGroup = groupedFees[groupKey] as InvoiceFeeFragment[]
              const firstFee = groupedFees[groupKey][0]

              if (
                feeGroup.length === 1 &&
                [FeeTypesEnum.Charge, FeeTypesEnum.Subscription].includes(feeGroup[0]?.feeType) &&
                firstFee?.creditableAmountCents > 0
              ) {
                return {
                  ...groupApp,
                  [`${index}_${firstFee?.id}`]: {
                    id: firstFee?.id,
                    checked: true,
                    value: firstFee?.creditableAmountCents / 100,
                    name: firstFee?.charge?.billableMetric?.name,
                    maxAmount: firstFee?.creditableAmountCents,
                    vatRate: firstFee?.vatRate,
                  },
                }
              }
              const grouped = feeGroup.reduce((accFee, feeGrouped) => {
                if (
                  feeGrouped?.creditableAmountCents === 0 ||
                  ![FeeTypesEnum.Charge, FeeTypesEnum.Subscription].includes(feeGrouped.feeType)
                ) {
                  return accFee
                }

                return {
                  ...accFee,
                  [feeGrouped?.id]: {
                    id: feeGrouped?.id,
                    checked: true,
                    value: feeGrouped?.creditableAmountCents / 100,
                    name: feeGrouped?.group?.key
                      ? `${feeGrouped?.group?.key} • ${feeGrouped?.group?.value}`
                      : (feeGrouped?.group?.value as string),
                    maxAmount: feeGrouped?.creditableAmountCents,
                    vatRate: feeGrouped?.vatRate,
                  },
                }
              }, {})

              return Object.keys(grouped).length > 0
                ? {
                    ...groupApp,
                    [groupKey]: {
                      name: firstFee?.charge?.billableMetric?.name as string,
                      grouped,
                    },
                  }
                : groupApp
            }, {}),
          },
        }
      },
      {}
    )
  }, [data?.invoice])

  return {
    loading,
    invoice: data?.invoice || undefined,
    feesPerInvoice,
    onCreate: async (values) => {
      const answer = await create({
        variables: {
          input: serializeCreditNoteInput(invoiceId as string, values),
        },
      })

      return answer as Promise<{
        data?: { createCreditNote?: { id?: string } }
        errors?: ApolloError
      }>
    },
  }
}
