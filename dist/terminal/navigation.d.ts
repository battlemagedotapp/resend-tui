export declare function pageWindow(itemCount: number, pageSize: number, requestedPage: number): {
    end: number;
    page: number;
    pageCount: number;
    start: number;
};
export declare function moveSelection(current: number, amount: number, itemCount: number): number;
export declare function shutdown(renderer: {
    destroy(): void;
}, exit?: (code: number) => void): void;
//# sourceMappingURL=navigation.d.ts.map