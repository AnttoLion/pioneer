import * as Prisma from '@prisma/client'
import { partition } from 'lodash'
import {
  arg,
  booleanArg,
  enumType,
  inputObjectType,
  list,
  mutationField,
  objectType,
  queryField,
  stringArg,
} from 'nexus'
import { Subscription as GQLSubscription } from 'nexus-prisma'

import { Context } from '@/api/context'
import { authMemberId } from '@/api/utils/token'
import { isDefaultNotification } from '@/notifier/model/defaultNotification'
import { GeneralSubscriptionKind } from '@/notifier/model/subscriptionKinds'

interface GeneralSubscription extends Omit<Prisma.Subscription, 'memberId' | 'entityId'> {
  kind: GeneralSubscriptionKind
}

const GeneralSubscriptionKindKeys: GeneralSubscriptionKind[] = Object.values(GeneralSubscriptionKind)

export const GQLGeneralSubscriptionKind = enumType({
  name: 'GeneralSubscriptionKind',
  members: GeneralSubscriptionKind,
})

export const GeneralSubscriptionFields = objectType({
  name: 'GeneralSubscription',
  description: GQLSubscription.$description,
  definition(t) {
    t.nonNull.id(GQLSubscription.id.name)
    t.nonNull.field({
      name: GQLSubscription.kind.name,
      type: GQLGeneralSubscriptionKind.name,
    })
    t.nonNull.boolean(GQLSubscription.shouldNotify.name)
    t.nonNull.boolean(GQLSubscription.shouldNotifyByEmail.name)
  },
})

type QueryArgs = Partial<GeneralSubscription>
export const generalSubscriptionsQuery = queryField('generalSubscriptions', {
  type: list('GeneralSubscription'),

  args: {
    id: stringArg(),
    kind: arg({ type: GQLGeneralSubscriptionKind.name }),
    shouldNotify: booleanArg(),
    shouldNotifyByEmail: booleanArg(),
  },

  resolve: async (_, args: QueryArgs, { prisma, req }: Context): Promise<Prisma.Subscription[] | null> => {
    const memberId = authMemberId(req)
    if (!memberId) return null

    const kind = args.kind ?? { in: GeneralSubscriptionKindKeys }
    return prisma.subscription.findMany({ where: { ...args, kind, memberId } })
  },
})

const generalSubscriptionsInput = inputObjectType({
  name: 'GeneralSubscriptionInput',
  definition(t) {
    t.nonNull.field({
      name: GQLSubscription.kind.name,
      type: GQLGeneralSubscriptionKind.name,
    })
    t.boolean(GQLSubscription.shouldNotify.name)
    t.boolean(GQLSubscription.shouldNotifyByEmail.name)
  },
})

type MutationArgs = { data: Omit<GeneralSubscription, 'id'>[] }
export const generalSubscriptionsMutation = mutationField('generalSubscriptions', {
  type: list('GeneralSubscription'),

  args: { data: list(generalSubscriptionsInput) },

  resolve: async (_, { data }: MutationArgs, { prisma, req }: Context): Promise<Prisma.Subscription[] | null> => {
    const memberId = authMemberId(req)
    if (!memberId) return null

    const kind = { in: GeneralSubscriptionKindKeys }
    const currents = await prisma.subscription.findMany({ where: { kind, memberId } })

    const changes = data.filter(({ kind, shouldNotify = true, shouldNotifyByEmail = true }) => {
      const notifyByDefault = isDefaultNotification(kind)
      return shouldNotify !== notifyByDefault || shouldNotifyByEmail !== notifyByDefault
    })

    const [toUpdate, toDelete] = partition(currents, (a) => changes.some((b) => b.kind === a.kind))

    const deleteTx = prisma.subscription.deleteMany({ where: { id: { in: toDelete.map(({ id }) => id) } } })

    const upsertTxs = changes.flatMap((input) => {
      const current = toUpdate.find((sub) => sub.kind === input.kind)

      if (!current) {
        return prisma.subscription.create({ data: { ...input, memberId } })
      }

      const { shouldNotify = true, shouldNotifyByEmail = true } = input
      if (shouldNotify === current.shouldNotify && shouldNotifyByEmail === current.shouldNotifyByEmail) {
        return []
      }

      return prisma.subscription.update({ where: { id: current.id }, data: { shouldNotify, shouldNotifyByEmail } })
    })

    const [, ...subscriptions] = await prisma.$transaction([deleteTx, ...upsertTxs])

    return subscriptions
  },
})
