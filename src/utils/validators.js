// Keep in sync with USERNAME_REGEX in the backend constants
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,20}$/;
export const USERNAME_RULE_MESSAGE = "3–20 characters: letters, numbers, _ or .";

export const usernameValidator = (username) => {
    if (!USERNAME_REGEX.test(username))
        return { isValid: false, errorMessage: USERNAME_RULE_MESSAGE };
}
