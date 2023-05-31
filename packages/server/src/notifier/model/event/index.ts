import { GetNotificationEventsQuery } from '@/common/queries'

import { fromPostAddedEvent, fromThreadCreatedEvent } from './forum'
import { NotificationEvent } from './utils'
import { buildEvents } from './utils/buildEvent'
import { ImplementedQNEvent } from './utils/types'

export { NotificationEvent, PotentialNotif, isGeneralPotentialNotif, isEntityPotentialNotif } from './utils'

type AnyQNEvent = GetNotificationEventsQuery['events'][0]

export const toNotificationEvents =
  (allMemberIds: number[]) =>
  async (anyEvent: AnyQNEvent): Promise<NotificationEvent> => {
    // NOTE: The conversion to ImplementedQNEvent assumes that the QN will only return
    // events with fragments defined in the codegen document.
    // As a result any event fragment not implemented here will result in a type error.
    const event = anyEvent as ImplementedQNEvent
    const build = buildEvents(allMemberIds, event)

    switch (event.__typename) {
      case 'PostAddedEvent':
        return fromPostAddedEvent(event, build)

      case 'ThreadCreatedEvent':
        return fromThreadCreatedEvent(event, build)
    }
  }
