import React, {useEffect} from 'react';
import type {ValueOf} from 'type-fest';
import ValidateCodeActionModal from '@components/ValidateCodeActionModal';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {clearDelegateErrorsByField, updateDelegateRole} from '@libs/actions/Delegate';
import {requestValidateCodeAction} from '@libs/actions/User';
import Navigation from '@libs/Navigation/Navigation';
import type CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

type UpdateDelegateMagicCodeModalProps = {
    login: string;
    role: ValueOf<typeof CONST.DELEGATE_ROLE>;
    isValidateCodeActionModalVisible: boolean;
    onClose?: () => void;
};
function UpdateDelegateMagicCodeModal({login, role, isValidateCodeActionModalVisible, onClose}: UpdateDelegateMagicCodeModalProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.ACCOUNT, {canBeMissing: true});
    const [validateCodeAction] = useOnyx(ONYXKEYS.VALIDATE_ACTION_CODE, {canBeMissing: true});
    const currentDelegate = account?.delegatedAccess?.delegates?.find((d) => d.email === login);
    const updateDelegateErrors = account?.delegatedAccess?.errorFields?.updateDelegateRole?.[login];

    useEffect(() => {
        if (currentDelegate?.role !== role || !!currentDelegate.pendingFields?.role || !!updateDelegateErrors) {
            return;
        }

        // Dismiss modal on successful magic code verification
        Navigation.goBack(ROUTES.SETTINGS_SECURITY);
    }, [login, currentDelegate, role, updateDelegateErrors]);

    const onBackButtonPress = () => {
        onClose?.();
    };

    const clearError = () => {
        if (isEmptyObject(updateDelegateErrors) && isEmptyObject(validateCodeAction?.errorFields)) {
            return;
        }
        clearDelegateErrorsByField(currentDelegate?.email ?? '', 'updateDelegateRole');
    };

    return (
        <ValidateCodeActionModal
            clearError={clearError}
            onClose={onBackButtonPress}
            validateCodeActionErrorField="updateDelegateRole"
            isLoading={currentDelegate?.isLoading}
            validateError={updateDelegateErrors}
            isVisible={isValidateCodeActionModalVisible}
            title={translate('delegate.makeSureItIsYou')}
            sendValidateCode={() => requestValidateCodeAction()}
            handleSubmitForm={(validateCode) => updateDelegateRole(login, role, validateCode)}
            descriptionPrimary={translate('delegate.enterMagicCode', {contactMethod: account?.primaryLogin ?? ''})}
        />
    );
}

UpdateDelegateMagicCodeModal.displayName = 'UpdateDelegateMagicCodeModal';

export default UpdateDelegateMagicCodeModal;
