/**
 * Utility for building reusable aggregation pipelines
 */
class QueryHelper {
    /**
     * Common stage for pagination
     */
    static paginate(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        return [
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];
    }

    /**
     * Common stage for sorting
     */
    static sort(sortBy = 'createdAt', order = -1) {
        return [{ $sort: { [sortBy]: order === 'desc' ? -1 : 1 } }];
    }

    /**
     * Common stage for search across multiple fields
     */
    static search(query, fields = []) {
        if (!query || fields.length === 0) return [];
        const searchConditions = fields.map(field => ({
            [field]: { $regex: query, $options: 'i' }
        }));
        return [{ $match: { $or: searchConditions } }];
    }

    /**
     * Reusable aggregation builder
     */
    static build(basePipeline = []) {
        return {
            pipeline: basePipeline,
            addStage(stage) {
                if (stage && Object.keys(stage).length > 0) {
                    this.pipeline.push(stage);
                }
                return this;
            },
            get() {
                return this.pipeline;
            }
        };
    }
}

module.exports = QueryHelper;
