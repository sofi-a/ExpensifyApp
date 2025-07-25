import React from 'react';
import {View} from 'react-native';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {updateAdvancedFilters} from '@libs/actions/Search';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import FILTER_KEYS from '@src/types/form/SearchAdvancedFiltersForm';

function SearchFiltersDescriptionPage() {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [searchAdvancedFiltersForm] = useOnyx(ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM);
    const description = searchAdvancedFiltersForm?.[FILTER_KEYS.DESCRIPTION];
    const {inputCallbackRef} = useAutoFocusInput();

    const updateDescriptionFilter = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM>) => {
        updateAdvancedFilters(values);
        Navigation.goBack(ROUTES.SEARCH_ADVANCED_FILTERS);
    };

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM>) => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM> = {};
        const descriptionValue = values.description.trim();

        if (descriptionValue.length > CONST.DESCRIPTION_LIMIT) {
            errors.description = translate('common.error.characterLimitExceedCounter', {length: descriptionValue.length, limit: CONST.DESCRIPTION_LIMIT});
        }

        return errors;
    };

    return (
        <ScreenWrapper
            testID={SearchFiltersDescriptionPage.displayName}
            shouldShowOfflineIndicatorInWideScreen
            offlineIndicatorStyle={styles.mtAuto}
            includeSafeAreaPaddingBottom
            shouldEnableMaxHeight
        >
            <HeaderWithBackButton
                title={translate('common.description')}
                onBackButtonPress={() => {
                    Navigation.goBack(ROUTES.SEARCH_ADVANCED_FILTERS);
                }}
            />
            <FormProvider
                style={[styles.flex1, styles.ph5]}
                formID={ONYXKEYS.FORMS.SEARCH_ADVANCED_FILTERS_FORM}
                validate={validate}
                onSubmit={updateDescriptionFilter}
                submitButtonText={translate('common.save')}
                enabledWhenOffline
                shouldHideFixErrorsAlert
            >
                <View style={styles.mb5}>
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={FILTER_KEYS.DESCRIPTION}
                        name={FILTER_KEYS.DESCRIPTION}
                        defaultValue={description}
                        label={translate('common.description')}
                        accessibilityLabel={translate('common.description')}
                        role={CONST.ROLE.PRESENTATION}
                        ref={inputCallbackRef}
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

SearchFiltersDescriptionPage.displayName = 'SearchFiltersDescriptionPage';

export default SearchFiltersDescriptionPage;
