
export const CommonActions = {
    WAITING: 'WAITING',
    WAITING_DONE: 'WAITING_DONE',
};

export function addAction(type: string, payload: any) {
    return { type, payload };
}