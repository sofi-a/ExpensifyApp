import Str from 'expensify-common/lib/str';
import type {OnyxEntry, OnyxUpdate} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import * as API from '@libs/API';
import type {
    OpenPublicProfilePageParams,
    UpdateAutomaticTimezoneParams,
    UpdateDateOfBirthParams,
    UpdateDisplayNameParams,
    UpdateHomeAddressParams,
    UpdateLegalNameParams,
    UpdatePronounsParams,
    UpdateSelectedTimezoneParams,
    UpdateUserAvatarParams,
} from '@libs/API/parameters';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import type {CustomRNImageManipulatorResult} from '@libs/cropOrRotateImage/types';
import DateUtils from '@libs/DateUtils';
import * as LocalePhoneNumber from '@libs/LocalePhoneNumber';
import Navigation from '@libs/Navigation/Navigation';
import * as PersonalDetailsUtils from '@libs/PersonalDetailsUtils';
import * as UserUtils from '@libs/UserUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {DateOfBirthForm, PersonalDetails, PersonalDetailsList, PrivatePersonalDetails} from '@src/types/onyx';
import type {SelectedTimezone, Timezone} from '@src/types/onyx/PersonalDetails';
import * as Session from './Session';

type FirstAndLastName = {
    firstName: string;
    lastName: string;
};

let currentUserEmail = '';
let currentUserAccountID = -1;
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: (val) => {
        currentUserEmail = val?.email ?? '';
        currentUserAccountID = val?.accountID ?? -1;
    },
});

let allPersonalDetails: OnyxEntry<PersonalDetailsList> = null;
Onyx.connect({
    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
    callback: (val) => (allPersonalDetails = val),
});

let privatePersonalDetails: OnyxEntry<PrivatePersonalDetails> = null;
Onyx.connect({
    key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
    callback: (val) => (privatePersonalDetails = val),
});

/**
 * Creates a new displayName for a user based on passed personal details or login.
 */
function createDisplayName(login: string, personalDetails: Pick<PersonalDetails, 'firstName' | 'lastName'> | OnyxEntry<PersonalDetails>): string {
    // If we have a number like +15857527441@expensify.sms then let's remove @expensify.sms and format it
    // so that the option looks cleaner in our UI.
    const userLogin = LocalePhoneNumber.formatPhoneNumber(login);

    if (!personalDetails) {
        return userLogin;
    }

    const firstName = personalDetails.firstName ?? '';
    const lastName = personalDetails.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    // It's possible for fullName to be empty string, so we must use "||" to fallback to userLogin.
    return fullName || userLogin;
}

/**
 * Gets the first and last name from the user's personal details.
 * If the login is the same as the displayName, then they don't exist,
 * so we return empty strings instead.
 */
function extractFirstAndLastNameFromAvailableDetails({login, displayName, firstName, lastName}: PersonalDetails): FirstAndLastName {
    // It's possible for firstName to be empty string, so we must use "||" to consider lastName instead.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (firstName || lastName) {
        return {firstName: firstName ?? '', lastName: lastName ?? ''};
    }
    if (login && Str.removeSMSDomain(login) === displayName) {
        return {firstName: '', lastName: ''};
    }

    if (displayName) {
        const firstSpaceIndex = displayName.indexOf(' ');
        const lastSpaceIndex = displayName.lastIndexOf(' ');
        if (firstSpaceIndex === -1) {
            return {firstName: displayName, lastName: ''};
        }

        return {
            firstName: displayName.substring(0, firstSpaceIndex).trim(),
            lastName: displayName.substring(lastSpaceIndex).trim(),
        };
    }

    return {firstName: '', lastName: ''};
}

/**
 * Convert country names obtained from the backend to their respective ISO codes
 * This is for backward compatibility of stored data before E/App#15507
 */
function getCountryISO(countryName: string): string {
    if (!countryName || countryName.length === 2) {
        return countryName;
    }

    return Object.entries(CONST.ALL_COUNTRIES).find(([, value]) => value === countryName)?.[0] ?? '';
}

function updatePronouns(pronouns: string) {
    if (currentUserAccountID) {
        const parameters: UpdatePronounsParams = {pronouns};

        API.write(WRITE_COMMANDS.UPDATE_PRONOUNS, parameters, {
            optimisticData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                    value: {
                        [currentUserAccountID]: {
                            pronouns,
                        },
                    },
                },
            ],
        });
    }

    Navigation.goBack();
}

function updateDisplayName(firstName: string, lastName: string) {
    if (currentUserAccountID) {
        const parameters: UpdateDisplayNameParams = {firstName, lastName};

        API.write(WRITE_COMMANDS.UPDATE_DISPLAY_NAME, parameters, {
            optimisticData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                    value: {
                        [currentUserAccountID]: {
                            firstName,
                            lastName,
                            displayName: createDisplayName(currentUserEmail ?? '', {
                                firstName,
                                lastName,
                            }),
                        },
                    },
                },
            ],
        });
    }

    Navigation.goBack();
}

function updateLegalName(legalFirstName: string, legalLastName: string) {
    const parameters: UpdateLegalNameParams = {legalFirstName, legalLastName};

    API.write(WRITE_COMMANDS.UPDATE_LEGAL_NAME, parameters, {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
                value: {
                    legalFirstName,
                    legalLastName,
                },
            },
        ],
    });

    Navigation.goBack(ROUTES.SETTINGS_PERSONAL_DETAILS);
}

/**
 * @param dob - date of birth
 */
function updateDateOfBirth({dob}: DateOfBirthForm) {
    const parameters: UpdateDateOfBirthParams = {dob};

    API.write(WRITE_COMMANDS.UPDATE_DATE_OF_BIRTH, parameters, {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
                value: {
                    dob,
                },
            },
        ],
    });

    Navigation.goBack(ROUTES.SETTINGS_PERSONAL_DETAILS);
}

function updateAddress(street: string, street2: string, city: string, state: string, zip: string, country: string) {
    const parameters: UpdateHomeAddressParams = {
        homeAddressStreet: street,
        addressStreet2: street2,
        homeAddressCity: city,
        addressState: state,
        addressZipCode: zip,
        addressCountry: country,
    };

    // State names for the United States are in the form of two-letter ISO codes
    // State names for other countries except US have full names, so we provide two different params to be handled by server
    if (country !== CONST.COUNTRY.US) {
        parameters.addressStateLong = state;
    }

    API.write(WRITE_COMMANDS.UPDATE_HOME_ADDRESS, parameters, {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
                value: {
                    address: {
                        street: PersonalDetailsUtils.getFormattedStreet(street, street2),
                        city,
                        state,
                        zip,
                        country,
                    },
                },
            },
        ],
    });

    Navigation.goBack(ROUTES.SETTINGS_PERSONAL_DETAILS);
}

/**
 * Updates timezone's 'automatic' setting, and updates
 * selected timezone if set to automatically update.
 */
function updateAutomaticTimezone(timezone: Timezone) {
    if (Session.isAnonymousUser()) {
        return;
    }

    if (!currentUserAccountID) {
        return;
    }

    const formatedTimezone = DateUtils.formatToSupportedTimezone(timezone);
    const parameters: UpdateAutomaticTimezoneParams = {
        timezone: JSON.stringify(formatedTimezone),
    };

    API.write(WRITE_COMMANDS.UPDATE_AUTOMATIC_TIMEZONE, parameters, {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                value: {
                    [currentUserAccountID]: {
                        timezone: formatedTimezone,
                    },
                },
            },
        ],
    });
}

/**
 * Updates user's 'selected' timezone, then navigates to the
 * initial Timezone page.
 */
function updateSelectedTimezone(selectedTimezone: SelectedTimezone) {
    const timezone: Timezone = {
        selected: selectedTimezone,
    };

    const parameters: UpdateSelectedTimezoneParams = {
        timezone: JSON.stringify(timezone),
    };

    if (currentUserAccountID) {
        API.write(WRITE_COMMANDS.UPDATE_SELECTED_TIMEZONE, parameters, {
            optimisticData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.PERSONAL_DETAILS_LIST,
                    value: {
                        [currentUserAccountID]: {
                            timezone,
                        },
                    },
                },
            ],
        });
    }

    Navigation.goBack(ROUTES.SETTINGS_TIMEZONE);
}

/**
 * Fetches additional personal data like legal name, date of birth, address
 */
function openPersonalDetailsPage() {
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
            value: {
                isLoading: true,
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
            value: {
                isLoading: false,
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
            value: {
                isLoading: false,
            },
        },
    ];

    API.read(READ_COMMANDS.OPEN_PERSONAL_DETAILS_PAGE, {}, {optimisticData, successData, failureData});
}

/**
 * Fetches public profile info about a given user.
 * The API will only return the accountID, displayName, and avatar for the user
 * but the profile page will use other info (e.g. contact methods and pronouns) if they are already available in Onyx
 */
function openPublicProfilePage(accountID: number) {
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [accountID]: {
                    isLoading: true,
                },
            },
        },
    ];

    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [accountID]: {
                    isLoading: false,
                },
            },
        },
    ];

    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [accountID]: {
                    isLoading: false,
                },
            },
        },
    ];

    const parameters: OpenPublicProfilePageParams = {accountID};

    API.read(READ_COMMANDS.OPEN_PUBLIC_PROFILE_PAGE, parameters, {optimisticData, successData, failureData});
}

/**
 * Updates the user's avatar image
 */
function updateAvatar(file: File | CustomRNImageManipulatorResult) {
    if (!currentUserAccountID) {
        return;
    }

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [currentUserAccountID]: {
                    avatar: file.uri,
                    avatarThumbnail: file.uri,
                    originalFileName: file.name,
                    errorFields: {
                        avatar: null,
                    },
                    pendingFields: {
                        avatar: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                        originalFileName: null,
                    },
                    fallbackIcon: file.uri,
                },
            },
        },
    ];
    const successData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [currentUserAccountID]: {
                    pendingFields: {
                        avatar: null,
                    },
                },
            },
        },
    ];
    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [currentUserAccountID]: {
                    avatar: allPersonalDetails?.[currentUserAccountID]?.avatar,
                    avatarThumbnail: allPersonalDetails?.[currentUserAccountID]?.avatarThumbnail ?? allPersonalDetails?.[currentUserAccountID]?.avatar,
                    pendingFields: {
                        avatar: null,
                    },
                } as OnyxEntry<Partial<PersonalDetails>>,
            },
        },
    ];

    const parameters: UpdateUserAvatarParams = {file};

    API.write(WRITE_COMMANDS.UPDATE_USER_AVATAR, parameters, {optimisticData, successData, failureData});
}

/**
 * Replaces the user's avatar image with a default avatar
 */
function deleteAvatar() {
    if (!currentUserAccountID) {
        return;
    }

    // We want to use the old dot avatar here as this affects both platforms.
    const defaultAvatar = UserUtils.getDefaultAvatarURL(currentUserAccountID);

    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [currentUserAccountID]: {
                    avatar: defaultAvatar,
                    fallbackIcon: null,
                },
            },
        },
    ];
    const failureData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
            value: {
                [currentUserAccountID]: {
                    avatar: allPersonalDetails?.[currentUserAccountID]?.avatar,
                    fallbackIcon: allPersonalDetails?.[currentUserAccountID]?.fallbackIcon,
                },
            },
        },
    ];

    API.write(WRITE_COMMANDS.DELETE_USER_AVATAR, {}, {optimisticData, failureData});
}

/**
 * Clear error and pending fields for the current user's avatar
 */
function clearAvatarErrors() {
    if (!currentUserAccountID) {
        return;
    }

    Onyx.merge(ONYXKEYS.PERSONAL_DETAILS_LIST, {
        [currentUserAccountID]: {
            errorFields: {
                avatar: null,
            },
            pendingFields: {
                avatar: null,
            },
        },
    });
}

/**
 * Get private personal details value
 */
function getPrivatePersonalDetails(): OnyxEntry<PrivatePersonalDetails> {
    return privatePersonalDetails;
}

export {
    clearAvatarErrors,
    deleteAvatar,
    extractFirstAndLastNameFromAvailableDetails,
    getCountryISO,
    createDisplayName,
    getPrivatePersonalDetails,
    openPersonalDetailsPage,
    openPublicProfilePage,
    updateAddress,
    updateAutomaticTimezone,
    updateAvatar,
    updateDateOfBirth,
    updateDisplayName,
    updateLegalName,
    updatePronouns,
    updateSelectedTimezone,
};
