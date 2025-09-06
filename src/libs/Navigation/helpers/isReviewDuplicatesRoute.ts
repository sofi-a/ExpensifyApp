import ROUTES from "@src/ROUTES";

function isReviewDuplicatesRoute(route?: string) {
    if (!route) {
        return false;
    }
    const routePattern = ROUTES.TRANSACTION_DUPLICATE_REVIEW_PAGE.route.replace(/:\w+/g, '[^/]+');
    const regex = new RegExp(`^/?${routePattern}$`);
    return regex.test(route);
}

export default isReviewDuplicatesRoute;