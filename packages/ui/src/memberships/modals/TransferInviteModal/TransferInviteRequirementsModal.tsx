import BN from 'bn.js'
import React, { useMemo } from 'react'
import styled from 'styled-components'

import { AccountInfo } from '../../../accounts/components/AccountInfo'
import { useAccounts } from '../../../accounts/hooks/useAccounts'
import { useBalance } from '../../../accounts/hooks/useBalance'
import { TransferModalCall } from '../../../accounts/modals/TransferModal'
import { ButtonPrimary } from '../../../common/components/buttons'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../common/components/Modal'
import { BalanceInfoInRow, InfoTitle, InfoValue } from '../../../common/components/Modals'
import { TextMedium, TokenValue } from '../../../common/components/typography'
import { BorderRad, Colors, Sizes } from '../../../common/constants'
import { useModal } from '../../../common/hooks/useModal'

interface Props {
  onClose: () => void
  address: string
  amount: BN
}

export function TransferInviteRequirementsModal({ onClose, address, amount }: Props) {
  const { showModal } = useModal()
  const { allAccounts } = useAccounts()
  const account = useMemo(
    () => allAccounts.find((acc) => acc.address == address) || { name: 'Controller account', address },
    [allAccounts]
  )
  const { transferable } = useBalance(account.address) || {}

  return (
    <Modal modalSize="m" modalHeight="s" onClose={onClose}>
      <ModalHeader onClick={onClose} title="Insufficient Funds" />
      <ModalBody>
        <TextMedium margin="s">
          Unfortunately, you don't have enough Tokens on your Controller account. You need at least{' '}
          <TokenValue value={amount} /> for the transaction fee.
        </TextMedium>
        <MemberRow>
          <AccountInfo account={account} />
          <BalanceInfoInRow>
            <InfoTitle>Transferable balance</InfoTitle>
            <InfoValue>
              <TokenValue value={transferable} />
            </InfoValue>
          </BalanceInfoInRow>
        </MemberRow>
      </ModalBody>
      <ModalFooter>
        <ButtonPrimary
          size="medium"
          onClick={() => showModal<TransferModalCall>({ modal: 'TransferTokens', data: { to: account } })}
        >
          Add JOY to Controller Account
        </ButtonPrimary>
      </ModalFooter>
    </Modal>
  )
}

const MemberRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  align-items: center;
  width: 100%;
  min-height: ${Sizes.accountHeight};
  max-height: ${Sizes.accountHeight};
  padding: 8px 72px 8px 14px;
  border: 1px solid ${Colors.Black[300]};
  border-radius: ${BorderRad.s};
  background-color: ${Colors.White};
`